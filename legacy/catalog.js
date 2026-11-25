const entries = [
  ['pedang-senja', 'Pendekar Pedang Senja', 'Manhwa', 'Aksi', 'Ongoing', 45, 93423, '3 jam', 9.4, 'Perjalanan pendekar penjaga jalur badai dimulai saat senja tidak lagi berakhir dan gerbang utara terbuka.', '#59202e', '#e2b8c2'],
  ['naga-bara', 'Takhta Naga Bara', 'Manhua', 'Fantasi', 'Ongoing', 151, 34782, '3 jam', 9.1, 'Lentera yang dipinjamnya dari seekor naga ternyata bisa menerangi masa depan kerajaan yang runtuh.', '#6e2d18', '#f0be73'],
  ['pewaris-kota', 'Pewaris Kota Ketiga', 'Manhwa', 'Drama', 'Ongoing', 163, 18547, '4 jam', 8.8, 'Setelah tiga kota bersatu, pewaris termuda menemukan namanya dihapus dari peta kekaisaran.', '#3c344a', '#d7b568'],
  ['kontrak-hujan', 'Kontrak di Bawah Hujan', 'Manga', 'Misteri', 'Ongoing', 436, 7839, '6 jam', 8.7, 'Seorang kurir harus mengembalikan surat yang tidak pernah ditulis oleh pengirimnya sebelum tengah malam.', '#4a1d2d', '#ebd0d5'],
  ['penjaga-rimba', 'Penjaga Rimba Abadi', 'Manhua', 'Fantasi', 'Ongoing', 591, 8546, '12 jam', 8.6, 'Ada pohon yang mengingat setiap langkah kaki, kecuali langkah satu orang pengembara dari selatan.', '#324222', '#efd08a'],
  ['petarung-fajar', 'Petarung Fajar Kedua', 'Manhwa', 'Aksi', 'Ongoing', 1585, 3110, '1 hr', 8.5, 'Untuk merebut hari esok, seorang pendekar harus kembali ke hari pertamanya berlatih di lembah sunyi.', '#322949', '#b8b9e8'],
  ['jalan-bulan', 'Jalan Menuju Bulan Utara', 'Manga', 'Petualangan', 'Completed', 612, 12490, '1 hr', 8.5, 'Sebuah kereta terakhir membawa tiga penumpang ke kota yang hanya muncul saat bulan purnama.', '#223e4e', '#a9d7db'],
  ['bintang-bisu', 'Pedang Bintang Bisu', 'Manhwa', 'Aksi', 'Ongoing', 209, 27640, '2 hr', 9.0, 'Sang pandai besi menyimpan cahaya bintang terakhir di dalam bilah pedang yang belum selesai ditempa.', '#463137', '#ebc09f'],
  ['taman-kaca', 'Taman Kaca dan Bayangan', 'Manga', 'Misteri', 'Ongoing', 842, 5410, '3 hr', 8.2, 'Di balik setiap kaca rumah tua itu, selalu ada satu bayangan tambahan yang meniru gerak pemiliknya.', '#21454a', '#c3dcd0'],
  ['akademi-awan', 'Akademi di Atas Awan', 'Manhua', 'Petualangan', 'Ongoing', 318, 19230, '3 hr', 8.9, 'Murid termuda di akademi udara mendapat tugas memetakan pulau yang terus berpindah mengikuti angin.', '#2d395b', '#b5cfeb'],
  ['hari-kilat', 'Hari Ketika Kilat Turun', 'Manhwa', 'Aksi', 'Ongoing', 715, 9870, '6 hr', 8.4, 'Peti berisi guntur terjatuh tepat di hadapan pemburu barang antik di pelabuhan tua.', '#543118', '#f0cb93'],
  ['perpustakaan-malam', 'Perpustakaan Tengah Malam', 'Manga', 'Drama', 'Completed', 504, 15320, '1 minggu', 8.8, 'Seorang pustakawan membuka buku yang menuliskan jawaban sebelum pertanyaan sempat terucap.', '#2d364a', '#b3c0e0'],
];
const chapterTitles = ['Jalan pulang', 'Tanda di cakrawala', 'Percakapan yang tertunda'];
const fallbackComics = entries.map(([id, title, type, genre, status, rank, followers, updated, rating, summary, base, ink], index) => ({
  id, title, type, genre, status, rank, followers, updated, rating, summary, base, ink, index,
  chapters: chapterTitles.map((chapterTitle, i) => ({ id: `${id}-${i + 1}`, number: i + 1, title: chapterTitle })),
}));
const palettes = entries.map(([, , , , , , , , , , base, ink]) => [base, ink]);
let scraped = [];
try {
  const res = await fetch('/data/catalog.json');
  if (res.ok) scraped = await res.json();
} catch {}
export const comics = Array.isArray(scraped) && scraped.length
  ? scraped.map((item, index) => ({
      ...item,
      index,
      base: palettes[index % palettes.length][0],
      ink: palettes[index % palettes.length][1],
      chapters: Array.isArray(item.chapters) && item.chapters.length ? item.chapters : [{ id: `${item.id}-1`, number: 1, title: '' }],
    }))
  : fallbackComics;
export const types = ['Manhwa', 'Manhua', 'Manga'];
export const genres = [...new Set(comics.map(comic => comic.genre))].sort();
export const allGenres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Isekai', 'Magic', 'Martial Arts', 'Murim', 'Mystery', 'Psychological', 'Romance', 'Sci-fi', 'Slice of Life', 'Supernatural', 'Thriller', 'Wuxia'];
export const seriesUrl = comic => `/series/${comic.id}`;
export const chapterUrl = chapter => `/chapter/${chapter.id}`;
export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const iconPaths = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L4 20l1.1-4.3A8.5 8.5 0 1 1 21 11.5Z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  chevLeft: '<path d="m15 18-6-6 6-6"/>',
  chevRight: '<path d="m9 18 6-6-6-6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  brand: '<path d="m12 2 8 10-8 10-8-10Z"/><path d="M8 12h8"/>',
};
export const icon = (name, size = 16) => `<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] ?? ''}</svg>`;

export function artwork(comic, panel = 0) {
  if (panel === 0 && comic.coverUrl) return comic.coverUrl;
  const { base, ink, index, title } = comic;
  const horizon = 170 + ((index * 41 + panel * 67) % 155);
  const moon = 56 + (index * 41 + panel * 53) % 188;
  const figure = panel === 2 ? 'translate(52 40) scale(.78)' : panel === 3 ? 'translate(-55 -30) scale(1.22)' : '';
  const lines = title.split(' ');
  const middle = Math.ceil(lines.length / 2);
  const lettering = panel ? '' : `<path d="M0 315h300v135H0z" fill="url(#shade)"/><text x="150" y="364">${lines.slice(0, middle).join(' ')}</text><text x="150" y="396">${lines.slice(middle).join(' ')}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><defs><linearGradient id="sky" x2=".65" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${base}"/><stop offset="1" stop-color="#101016"/></linearGradient><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#0a0a0d" stop-opacity="0"/><stop offset="1" stop-color="#0a0a0d"/></linearGradient><pattern id="grain" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5 5 0" opacity=".14" stroke="${ink}" stroke-width=".45"/></pattern></defs><path fill="url(#sky)" d="M0 0h300v450H0z"/><circle cx="${moon}" cy="108" r="68" fill="${ink}" opacity=".16"/><circle cx="${moon}" cy="108" r="48" fill="${ink}" opacity=".72"/><path d="M0 ${horizon} 45 224 82 184 130 232 182 164 217 193 261 144 300 173V450H0Z" fill="#101017" opacity=".63"/><path d="M-20 345 290 20M5 382 310 41M-10 168 174 0M150 450 310 270" stroke="${ink}" stroke-width="1.2" opacity=".45"/><path d="M0 0h300v450H0z" fill="url(#grain)"/><g transform="${figure}" stroke="#14111a" stroke-linejoin="round" stroke-width="4"><path d="M46 389 69 274l53-31 13-32 56-4 9 35 53 40 20 107Z" fill="${base}"/><path d="M73 273l55-26 32 25 36-29 49 37-73 91-16-61-20 54Z" fill="#171521"/><path d="M102 156l17-43 61-16 40 32-9 68-17 24-37 24-31-31Z" fill="${ink}"/><path d="M96 172l-2-44 27-38 70-16 23 24 15 27-9 59-14-43-15 35-9-39-26 40 3-26-34 35-7-27-11 31Z" fill="#171421"/><path d="m129 194 21-3m31-4 18-6m-35 38 18-4" fill="none" stroke-width="3"/><path d="M78 343 232 198l7 3-117 165-19 5Z" fill="${ink}"/><path d="M93 351l29 25" stroke="${ink}" stroke-width="7"/></g><path d="M9 9h282v432H9z" fill="none" stroke="${ink}" stroke-opacity=".45"/><g text-anchor="middle" font-family="Georgia,serif" font-size="25" font-weight="bold" fill="${ink}" stroke="#14111a" stroke-width="2" paint-order="stroke">${lettering}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
