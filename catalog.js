const entries = [
  ['pedang-senja', 'Pendekar Pedang Senja', 'Manhwa', 'Aksi', 'Ongoing', 45, 93423, '3 jam', 9.4, 'Perjalanan pendekar penjaga jalur badai dimulai saat senja tidak lagi berakhir dan gerbang utara terbuka.', '#811d35', '#dba9b8'],
  ['naga-bara', 'Takhta Naga Bara', 'Manhua', 'Fantasi', 'Ongoing', 151, 34782, '3 jam', 9.1, 'Lentera yang dipinjamnya dari seekor naga ternyata bisa menerangi masa depan kerajaan yang runtuh.', '#a53713', '#ffb747'],
  ['pewaris-kota', 'Pewaris Kota Ketiga', 'Manhwa', 'Drama', 'Ongoing', 163, 18547, '4 jam', 8.8, 'Setelah tiga kota bersatu, pewaris termuda menemukan namanya dihapus dari peta kekaisaran.', '#53446a', '#d7b568'],
  ['kontrak-hujan', 'Kontrak di Bawah Hujan', 'Manga', 'Misteri', 'Ongoing', 436, 7839, '6 jam', 8.7, 'Seorang kurir harus mengembalikan surat yang tidak pernah ditulis oleh pengirimnya sebelum tengah malam.', '#571d33', '#f5cdd3'],
  ['penjaga-rimba', 'Penjaga Rimba Abadi', 'Manhua', 'Fantasi', 'Ongoing', 591, 8546, '12 jam', 8.6, 'Ada pohon yang mengingat setiap langkah kaki, kecuali langkah satu orang pengembara dari selatan.', '#3d5127', '#ffd27d'],
  ['petarung-fajar', 'Petarung Fajar Kedua', 'Manhwa', 'Aksi', 'Ongoing', 1585, 3110, '1 hr', 8.5, 'Untuk merebut hari esok, seorang pendekar harus kembali ke hari pertamanya berlatih di lembah sunyi.', '#472272', '#a6a7fe'],
  ['jalan-bulan', 'Jalan Menuju Bulan Utara', 'Manga', 'Petualangan', 'Completed', 612, 12490, '1 hr', 8.5, 'Sebuah kereta terakhir membawa tiga penumpang ke kota yang hanya muncul saat bulan purnama.', '#244a5f', '#9be1e6'],
  ['bintang-bisu', 'Pedang Bintang Bisu', 'Manhwa', 'Aksi', 'Ongoing', 209, 27640, '2 hr', 9.0, 'Sang pandai besi menyimpan cahaya bintang terakhir di dalam bilah pedang yang belum selesai ditempa.', '#50363e', '#f0b88f'],
  ['taman-kaca', 'Taman Kaca dan Bayangan', 'Manga', 'Misteri', 'Ongoing', 842, 5410, '3 hr', 8.2, 'Di balik setiap kaca rumah tua itu, selalu ada satu bayangan tambahan yang meniru gerak pemiliknya.', '#24575d', '#bfe2ce'],
  ['akademi-awan', 'Akademi di Atas Awan', 'Manhua', 'Petualangan', 'Ongoing', 318, 19230, '3 hr', 8.9, 'Murid termuda di akademi udara mendapat tugas memetakan pulau yang terus berpindah mengikuti angin.', '#344373', '#a6cdf6'],
  ['hari-kilat', 'Hari Ketika Kilat Turun', 'Manhwa', 'Aksi', 'Ongoing', 715, 9870, '6 hr', 8.4, 'Peti berisi guntur terjatuh tepat di hadapan pemburu barang antik di pelabuhan tua.', '#643713', '#ffd18e'],
  ['perpustakaan-malam', 'Perpustakaan Tengah Malam', 'Manga', 'Drama', 'Completed', 504, 15320, '1 minggu', 8.8, 'Seorang pustakawan membuka buku yang menuliskan jawaban sebelum pertanyaan sempat terucap.', '#35415d', '#a7b8e9'],
];
const chapterTitles = ['Jalan pulang', 'Tanda di cakrawala', 'Percakapan yang tertunda'];
export const comics = entries.map(([id, title, type, genre, status, rank, followers, updated, rating, summary, base, ink], index) => ({
  id, title, type, genre, status, rank, followers, updated, rating, summary, base, ink, index,
  chapters: chapterTitles.map((chapterTitle, i) => ({ id: `${id}-${i + 1}`, number: i + 1, title: chapterTitle })),
}));
export const types = ['Manhwa', 'Manhua', 'Manga'];
export const genres = [...new Set(comics.map(comic => comic.genre))].sort();
export const allGenres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Isekai', 'Magic', 'Martial Arts', 'Murim', 'Mystery', 'Psychological', 'Romance', 'Sci-fi', 'Slice of Life', 'Supernatural', 'Thriller', 'Wuxia'];
export const seriesUrl = comic => `/series/${comic.id}`;
export const chapterUrl = chapter => `/chapter/${chapter.id}`;
export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function artwork(comic, panel = 0) {
  const { base, ink, index, title } = comic;
  const horizon = 170 + ((index * 41 + panel * 67) % 155);
  const moon = 56 + (index * 41 + panel * 53) % 188;
  const figure = panel === 2 ? 'translate(52 40) scale(.78)' : panel === 3 ? 'translate(-55 -30) scale(1.22)' : '';
  const lines = title.split(' ');
  const middle = Math.ceil(lines.length / 2);
  const lettering = panel ? '' : `<path d="M0 315h300v135H0z" fill="url(#shade)"/><text x="150" y="364">${lines.slice(0, middle).join(' ')}</text><text x="150" y="396">${lines.slice(middle).join(' ')}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><defs><linearGradient id="sky" x2=".65" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${base}"/><stop offset="1" stop-color="#10101c"/></linearGradient><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#09090f" stop-opacity="0"/><stop offset="1" stop-color="#09090f"/></linearGradient><pattern id="grain" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5 5 0" opacity=".16" stroke="${ink}" stroke-width=".45"/></pattern></defs><path fill="url(#sky)" d="M0 0h300v450H0z"/><circle cx="${moon}" cy="108" r="68" fill="${ink}" opacity=".18"/><circle cx="${moon}" cy="108" r="48" fill="${ink}" opacity=".77"/><path d="M0 ${horizon} 45 224 82 184 130 232 182 164 217 193 261 144 300 173V450H0Z" fill="#10101d" opacity=".63"/><path d="M-20 345 290 20M5 382 310 41M-10 168 174 0M150 450 310 270" stroke="${ink}" stroke-width="1.2" opacity=".49"/><path d="M0 0h300v450H0z" fill="url(#grain)"/><g transform="${figure}" stroke="#14111a" stroke-linejoin="round" stroke-width="4"><path d="M46 389 69 274l53-31 13-32 56-4 9 35 53 40 20 107Z" fill="${base}"/><path d="M73 273l55-26 32 25 36-29 49 37-73 91-16-61-20 54Z" fill="#171525"/><path d="M102 156l17-43 61-16 40 32-9 68-17 24-37 24-31-31Z" fill="${ink}"/><path d="M96 172l-2-44 27-38 70-16 23 24 15 27-9 59-14-43-15 35-9-39-26 40 3-26-34 35-7-27-11 31Z" fill="#171421"/><path d="m129 194 21-3m31-4 18-6m-35 38 18-4" fill="none" stroke-width="3"/><path d="M78 343 232 198l7 3-117 165-19 5Z" fill="${ink}"/><path d="M93 351l29 25" stroke="${ink}" stroke-width="7"/></g><path d="M9 9h282v432H9z" fill="none" stroke="${ink}" stroke-opacity=".58"/><g text-anchor="middle" font-family="Georgia,serif" font-size="25" font-weight="bold" fill="${ink}" stroke="#14111a" stroke-width="2" paint-order="stroke">${lettering}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
