import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const headers = {
  Accept: 'application/json',
  Origin: 'https://s1.shinigami.mx',
  Referer: 'https://s1.shinigami.mx/',
};
const res = await fetch('https://api.shinigami.io/v1/manga/list?sort=latest&sort_order=desc&offset=0&limit=24', { headers });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const payload = await res.json();
const items = [];

for (const item of payload.data ?? []) {
  const chRes = await fetch(`https://api.shinigami.io/v1/chapter/${item.manga_id}/list?page=1&page_size=20&sort_by=chapter_number&sort_order=desc`, { headers });
  const chJson = chRes.ok ? await chRes.json().catch(() => null) : null;
  const chapters = (chJson?.data ?? [])
    .map(ch => ({
      id: ch.chapter_id,
      number: Number(ch.chapter_number ?? 0),
      title: (ch.chapter_title ?? '').trim() || `Chapter ${ch.chapter_number ?? ''}`.trim(),
    }))
    .reverse();

  items.push({
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
    coverUrl: item.cover_portrait_url || item.cover_image_url || '',
    chapters: chapters.length ? chapters : [{ id: `${item.manga_id}-1`, number: 1, title: 'Chapter 1' }],
  });
  await delay(120);
}

await mkdir('data', { recursive: true });
await writeFile('data/catalog.json', JSON.stringify(items, null, 2));
console.log(`Saved ${items.length} comics with chapters to data/catalog.json`);
