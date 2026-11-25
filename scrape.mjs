import { randomUUID } from 'node:crypto';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { encodeCover } from './optimize-covers.mjs';

const headers = {
  Accept: 'application/json',
  Origin: 'https://s1.shinigami.mx',
  Referer: 'https://s1.shinigami.mx/',
};
const panelLimit = Number(process.argv.find(a => a.startsWith('--panels='))?.split('=')[1] ?? 24);

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function downloadFile(url, dest) {
  if (!url || await exists(dest)) return true;
  const res = await fetch(url, { headers: { Referer: 'https://s1.shinigami.mx/' } }).catch(() => null);
  if (!res?.ok) return false;
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function downloadCover(url, id) {
  if (!url || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)) return url;
  const local = `/media/covers/${id}-360.webp`;
  if (await exists(`data${local}`)) return local;
  const source = `data${local}.${randomUUID()}.source`;
  try {
    if (!await downloadFile(url, source)) return url;
    await encodeCover(source, `data${local}`);
    return local;
  } catch (error) {
    if (error.code === 'ENOENT') throw error;
    console.warn(`Could not optimize cover ${id}: ${error.message}`);
    return url;
  } finally {
    await rm(source, { force: true });
  }
}

async function pool(list, concurrency, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < list.length) {
      const idx = i++;
      await fn(list[idx], idx);
    }
  }));
}

await mkdir('data/media/covers', { recursive: true });
await mkdir('data/media/chapters', { recursive: true });

const rawItems = [];
for (let offset = 0; ; ) {
  const res = await fetch(`https://api.shinigami.io/v1/manga/list?sort=latest&sort_order=desc&offset=${offset}&limit=100`, { headers });
  if (!res.ok) throw new Error(`Catalog HTTP ${res.status}`);
  const payload = await res.json();
  const batch = payload.data ?? [];
  rawItems.push(...batch);
  if (!payload.meta?.has_next || batch.length === 0) break;
  offset += batch.length;
}
console.log(`Fetched ${rawItems.length} catalog entries`);

const items = new Array(rawItems.length);
await pool(rawItems, 8, async (item, idx) => {
  const chRes = await fetch(`https://api.shinigami.io/v1/chapter/${item.manga_id}/list?page=1&page_size=20&sort_by=chapter_number&sort_order=desc`, { headers }).catch(() => null);
  const chJson = chRes?.ok ? await chRes.json().catch(() => null) : null;
  const chapters = (chJson?.data ?? [])
    .map(ch => ({
      id: ch.chapter_id,
      number: Number(ch.chapter_number ?? 0),
      title: (ch.chapter_title ?? '').trim() || `Chapter ${ch.chapter_number ?? ''}`.trim(),
    }))
    .reverse();

  const coverUrl = await downloadCover(item.cover_portrait_url || item.cover_image_url || '', item.manga_id);

  items[idx] = {
    id: item.manga_id,
    title: item.title,
    type: item.country_id === 'CN' ? 'Manhua' : item.country_id === 'JP' ? 'Manga' : 'Manhwa',
    genre: item.taxonomy?.Genre?.[0]?.name ?? 'Aksi',
    status: item.status === 2 ? 'Completed' : 'Ongoing',
    rank: item.rank ?? 0,
    followers: item.bookmark_count ?? 0,
    updated: (item.latest_chapter_time ?? item.updated_at ?? '').slice(0, 10),
    rating: Number(item.user_rate ?? 0),
    summary: (item.description ?? '').trim(),
    latestChapterNumber: item.latest_chapter_number ?? (chapters.at(-1)?.number || 1),
    coverUrl,
    chapters: chapters.length ? chapters : [{ id: `${item.manga_id}-1`, number: 1, title: 'Chapter 1' }],
  };
});

let panelCount = 0;
const panelTargets = items.slice(0, panelLimit).map(c => c.chapters.at(-1)).filter(c => c && /^[0-9a-f-]{36}$/.test(c.id));
await pool(panelTargets, 4, async ch => {
  const dir = `data/media/chapters/${ch.id}`;
  await mkdir(dir, { recursive: true });
  const r = await fetch(`https://api.shinigami.io/v1/chapter/detail/${ch.id}`, { headers }).catch(() => null);
  const j = r?.ok ? await r.json().catch(() => null) : null;
  const d = j?.data;
  const base = d?.base_url?.replace(/\/?$/, '/');
  const prefix = d?.chapter?.path?.replace(/^\/+/, '') ?? '';
  if (!base || !Array.isArray(d?.chapter?.data)) return;
  await Promise.all(d.chapter.data.map(async (name, n) => {
    const ext = extname(name) || '.webp';
    const file = `${dir}/${String(n + 1).padStart(3, '0')}${ext}`;
    if (await downloadFile(new URL(prefix + name, base).href, file)) panelCount++;
  }));
});

await writeFile('data/catalog.json', JSON.stringify(items, null, 2));
console.log(`Saved ${items.length} comics, local covers, and ${panelCount} chapter panels`);
