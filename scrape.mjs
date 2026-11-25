import { mkdir, writeFile } from 'node:fs/promises';

const url = 'https://api.shinigami.io/v1/manga/list?sort=latest&sort_order=desc&offset=0&limit=24';
const res = await fetch(url, {
  headers: {
    Accept: 'application/json',
    Origin: 'https://s1.shinigami.mx',
    Referer: 'https://s1.shinigami.mx/',
  },
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const payload = await res.json();
const items = (payload.data ?? []).map(item => ({
  id: item.manga_id,
  title: item.title,
  type: item.country_id === 'CN' ? 'Manhua' : item.country_id === 'JP' ? 'Manga' : 'Manhwa',
  genre: item.taxonomy?.Genre?.[0]?.name ?? 'Aksi',
  status: item.status === 2 ? 'Completed' : 'Ongoing',
  rank: item.rank ?? 0,
  followers: item.bookmark_count ?? 0,
  updated: item.latest_chapter_time ?? item.updated_at ?? '',
  rating: Number(item.user_rate ?? 0),
  summary: (item.description ?? '').trim(),
  latestChapterNumber: item.latest_chapter_number ?? 1,
  coverUrl: item.cover_portrait_url || item.cover_image_url || '',
}));

await mkdir('data', { recursive: true });
await writeFile('data/catalog.json', JSON.stringify(items, null, 2));
console.log(`Saved ${items.length} comics to data/catalog.json`);
