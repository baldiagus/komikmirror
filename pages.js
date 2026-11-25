import { allGenres, artwork, chapterUrl, comics, escape as e, genres, seriesUrl, types } from './catalog.js';

const groups = ['Rekomendasi', 'Rank Harian', 'Rank Mingguan', 'Rank All Time'];
const libraryTabs = ['Bookmark', 'Riwayat', 'Antrean'];
const categories = ['Semua', 'Pengumuman', 'Info Komik', 'Ruang Diskusi', 'Spoiler', 'Polling', 'Review'];
const notifTabs = ['Semua', 'Komik', 'Komunitas', 'Akun'];
const settingsMenu = [
  ['akun', 'Akun', 'Username, foto, dan banner profil'],
  ['baca', 'Baca', 'Mode, lebar, dan lanjut otomatis'],
  ['notifikasi', 'Notifikasi', 'Chapter baru, komentar, pengumuman'],
  ['privasi', 'Privasi', 'Siapa yang bisa lihat aktivitas kamu'],
  ['selera', 'Selera baca', 'Genre dan tema favorit kamu buat beranda'],
  ['pembayaran', 'Pembayaran', 'Riwayat order dan status Premium'],
];
const chatGroups = [
  ['PREMIUM', [['diskusi-elit', 'diskusi-elit', true]]],
  ['UMUM', [['umum', 'umum'], ['rekomendasi', 'rekomendasi'], ['teori-spoiler', 'teori-spoiler'], ['fanart', 'fanart'], ['off-topic', 'off-topic']]],
  ['PENGADUAN', [['aduan-member', 'aduan-member'], ['aduan-web', 'aduan-web']]],
];
const faq = [
  ['Ini langganan atau sekali bayar?', 'Sekali bayar untuk durasi yang kamu pilih, tanpa perpanjangan otomatis dan tanpa tagihan berulang. Pembelian tidak tersedia di demo lokal.'],
  ['Apa itu Aura Multiplier?', 'Pengali menentukan jumlah aura yang didapat dari aktivitas komunitas seperti upvote komentar dan postingan.'],
  ['Apa bedanya Plus, Pro, dan Max?', 'Perbedaan utamanya adalah pengali aura (3x, 5x, 10x), border avatar, dan akses fitur premium.'],
];
export const guides = [
  ['halaman-baca', 'Halaman baca', 'Mode baca, auto-scroll, komentar, dan lapor chapter', '7 panduan', 'Gunakan mode Gulir untuk Manhwa/Manhua atau Halaman untuk Manga. Preferensi lebar dan lanjut otomatis dapat diubah di Pengaturan Baca.'],
  ['detail-komik', 'Detail komik', 'Bookmark, notif chapter baru, rating, dan review', '6 panduan', 'Simpan judul ke Bookmark atau Antrean dari halaman detail komik agar cepat diakses kembali di Pustaka.'],
  ['profil-akun', 'Profil & akun', 'Aura, lencana, privasi, notifikasi, klaim akun lama', '10 panduan', 'Kelola foto, nama tampilan, username, dan privasi aktivitas dari halaman Pengaturan Akun.'],
  ['premium', 'Premium', 'Paket, harga, cara bayar, dan status order', '6 panduan', 'Paket Plus, Pro, dan Max tersedia bulanan maupun tahunan. Demo lokal tidak memproses pembayaran nyata.'],
  ['komunitas', 'Komunitas', 'Postingan, Atur gambar, dan Chat', '2 panduan', 'Gunakan kategori yang sesuai saat menulis post dan tandai spoiler sebelum menyebut nomor chapter.'],
];
const badgeGroups = [
  ['Shadow', 4, 'Peringkat Aura sepanjang masa, live. Kamu cuma menampilkan tier tertinggi, diperbarui dua kali sehari.', [
    ['Shadow Monarch', 'MYTHICAL', 'Peringkat #1 aura sepanjang masa'],
    ['Shadow King', 'MYTHICAL', 'Peringkat #2–10 aura sepanjang masa'],
    ['Shadow Prince', 'LEGENDARY', 'Peringkat #11–50 aura sepanjang masa'],
    ['Shadow Knight', 'EPIC', 'Peringkat #51–100 aura sepanjang masa'],
  ]],
  ['Trofi musim', 4, 'Permanen. Satu set per musim, sesuai posisi akhir di Leaderboard.', [
    ['S1 Champion', 'LEGENDARY', 'Peringkat #1 di Season 1 (2026-11-17 – 2026-12-31 WIB)'],
    ['S1 Vanguard', 'LEGENDARY', 'Peringkat #2–10 di Season 1 (2026-11-17 – 2026-12-31 WIB)'],
    ['S1 Elite', 'EPIC', 'Peringkat #11–50 di Season 1 (2026-11-17 – 2026-12-31 WIB)'],
    ['S1 Contender', 'EPIC', 'Peringkat #51–100 di Season 1 (2026-11-17 – 2026-12-31 WIB)'],
  ]],
  ['Reaper', 3, 'Penguasa Aura di satu judul.', [
    ['Reaper of Manhwa', 'LEGENDARY', 'Masuk 5 besar aura di satu judul manhwa'],
    ['Reaper of Manhua', 'RARE', 'Masuk 5 besar aura di satu judul manhua'],
    ['Reaper of Manga', 'COMMON', 'Masuk 5 besar aura di satu judul manga'],
  ]],
];
const auraFaq = [
  ['AURA', 'Apa itu Aura?', 'Aura adalah reputasi kamu di Shinigami. Angkanya nambah tiap komentar kamu di-upvote, dan tiap postingan kamu di-upvote pembaca lain — upvote di postingan bernilai 5x lipat dari upvote di komentar.'],
  ['AURA', 'Berapa multiplier Aura buat premium?', 'Plus memberi 3x, Pro 5x, dan Max 10x multiplier Aura.'],
  ['AURA', 'Apa itu Hunter E-Rank sampai S-Rank?', 'Tingkatan lencana berdasarkan total Aura mulai 500 (E-Rank) hingga 50.000 (S-Rank).'],
  ['BADGE', 'Kenapa cuma dua badge yang tampil di komentar aku?', 'Komentar menampilkan maksimal dua badge dengan rarity tertinggi yang kamu miliki.'],
  ['BADGE', 'Apa beda Common, Rare, Epic, Legendary, dan Mythical?', 'Tingkat kelangkaan badge dari pencapaian biasa hingga peringkat puncak komunitas.'],
  ['LEADERBOARD', 'Leaderboard dihitung dari apa?', 'Dihitung dari akumulasi Aura yang terkumpul pada periode harian, mingguan, atau sepanjang waktu.'],
];

export const tabLinks = (labels, active, url) => `<nav class="tabs" aria-label="Tampilan">${labels.map((label, i) => `<a class="chip${i === active ? ' selected' : ''}" ${i === active ? 'aria-current="page"' : ''} href="${url(i)}">${label}</a>`).join('')}</nav>`;
const tabHref = (base, key, index) => index ? `${base}?${key}=${index}` : base;
const tabIndex = (query, name, limit) => { const n = Number(query.get(name)); return Number.isInteger(n) && n >= 0 && n < limit ? n : 0; };
const cover = (comic, lazy = true) => `<img class="cover" src="${artwork(comic)}" alt="" width="300" height="450"${lazy ? ' loading="lazy"' : ''}>`;
const title = text => `<h1 class="page-title">${text}</h1>`;
const box = (head, text, action = '') => `<section class="empty surface"><h2>${head}</h2><p>${text}</p>${action}</section>`;
const link = (text, href, className = 'chip') => `<a class="${className}" href="${href}">${text}</a>`;
const select = (id, label, values, selected) => `<label>${label}<select name="${id}">${values.map(([value, text]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
const toggle = (name, label, checked, sub = '') => `<label class="switch-row"><span><strong>${label}</strong>${sub ? `<small class="meta">${sub}</small>` : ''}</span><input name="${name}" type="checkbox"${checked ? ' checked' : ''}></label>`;
const handleOf = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'huoling02';
const initials = name => (name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || 'HL').toUpperCase();

function tiles(items, chapters = false) {
  return `<div class="grid">${items.map(comic => `<article class="tile"><a href="${seriesUrl(comic)}">${cover(comic)}<h3>${comic.title}</h3></a>${chapters ? `<div class="chapter-pills">${comic.chapters.slice(-2).reverse().map(ch => link(`Chapter ${ch.number}`, chapterUrl(ch))).join('')}</div>` : `<p class="meta">${comic.type} · ${comic.genre} <span>★ ${comic.rating.toFixed(1)}</span></p>`}</article>`).join('')}</div>`;
}

export function home(state, query) {
  const hero = [comics[4], comics[8], comics[9], comics[5], comics[0], comics[7], comics[6]];
  const active = tabIndex(query, 'rank', groups.length);
  const filtered = tabIndex(query, 'jenis', types.length + 1);
  const ranked = [...comics];
  if (active === 0 && state.prefs.taste) ranked.sort((a, b) => Number(b.type === state.prefs.taste) - Number(a.type === state.prefs.taste));
  if (active === 1) ranked.sort((a, b) => (a.index % 3) - (b.index % 3));
  if (active === 2) ranked.reverse();
  if (active === 3) ranked.sort((a, b) => b.rating - a.rating);
  const items = filtered ? comics.filter(x => x.type === types[filtered - 1]) : comics;
  return `<h1 class="sr-only">Beranda</h1><section class="hero" aria-label="Komik unggulan">
    <div class="hero-track">${hero.map((comic, i) => `<a class="hero-cover${i === 3 ? ' featured' : ''}" href="${seriesUrl(comic)}" aria-label="${comic.title}, rating ${comic.rating.toFixed(1)}">${cover(comic, false)}<span class="rating">★ ${comic.rating.toFixed(1)}</span><strong>${comic.title}</strong></a>`).join('')}</div>
    <button class="hero-arrow prev" data-slide="-1" aria-label="Unggulan sebelumnya">‹</button><button class="hero-arrow next" data-slide="1" aria-label="Unggulan berikutnya">›</button></section>
    <section class="rank-section"><h2 class="sr-only">Peringkat komik</h2>${tabLinks(groups, active, i => { const q = new URLSearchParams(query); q.set('rank', i); return `/?${e(q)}#rank`; })}
    <div id="rank" class="rank-track" tabindex="0" aria-label="Daftar peringkat">${ranked.slice(0, 9).map((comic, i) => `<a class="rank-card" href="${seriesUrl(comic)}">${cover(comic)}<div class="rank-meta"><b>${i + 1}</b><div><strong>${comic.title}</strong><small>Ch. ${comic.chapters.length} · ${comic.updated}</small></div></div></a>`).join('')}</div>
    <div class="rail-actions"><button data-rail="-1" aria-label="Peringkat sebelumnya">‹</button><button data-rail="1" aria-label="Peringkat berikutnya">›</button></div></section>
    <section id="project"><div class="section-heading"><h2>Project</h2>${tabLinks(['Semua', ...types], filtered, i => { const q = new URLSearchParams(query); q.set('jenis', i); return `/?${e(q)}#project`; })}</div>${tiles(items, true)}</section>`;
}

export function catalog(state, query) {
  const keyword = (query.get('q') ?? '').slice(0, 100).trim();
  const type = query.get('type') ?? '';
  const genre = query.get('genre') ?? '';
  const sort = query.get('sort') ?? '';
  const list = comics.filter(x => (!type || x.type === type) && (!genre || x.genre === genre) && x.title.toLowerCase().includes(keyword.toLowerCase()));
  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  if (sort === 'name') list.sort((a, b) => a.title.localeCompare(b.title, 'id'));
  return `${title('Daftar Komik')}<form class="series-toolbar" action="/series">
    <label class="sr-only" for="series-q">Cari judul manga</label>
    <input id="series-q" name="q" type="search" value="${e(keyword)}" maxlength="100" placeholder="Cari judul manga...">
    <details class="filter-pop"><summary class="chip">Filter</summary><div class="surface filter-panel">
      ${select('type', 'Jenis', [['', 'Semua jenis'], ...types.map(x => [x, x])], type)}
      ${select('genre', 'Genre', [['', 'Semua genre'], ...genres.map(x => [x, x])], genre)}
      <div class="actions"><button class="primary">Terapkan</button>${link('Reset', '/series')}</div></div></details>
    <select name="sort" aria-label="Urutkan" data-auto-submit>${[['', 'Update terbaru'], ['rating', 'Rating tertinggi'], ['name', 'Judul A–Z']].map(([v, t]) => `<option value="${v}"${v === sort ? ' selected' : ''}>${t}</option>`).join('')}</select>
  </form>
  ${list.length ? `<h2 class="sr-only">Hasil pencarian</h2><div class="series-grid">${list.map(comic => `<a class="surface series-card" href="${seriesUrl(comic)}">${cover(comic)}<div class="series-body"><h3>${comic.title}</h3><p class="meta">${comic.type} · ${comic.status}</p><p class="series-stats"><span class="points">#${comic.rank}</span><span>${comic.followers.toLocaleString('en-US')}</span><span class="points">★ ${comic.rating.toFixed(1)}</span></p><p class="series-excerpt">${comic.summary}</p><p class="series-ch"><strong class="points">Chapter ${comic.chapters.length}</strong> · <span class="meta">${comic.updated}</span></p></div></a>`).join('')}</div>` : box('Tidak ada hasil', 'Coba kata kunci atau filter lain.', link('Lihat semua komik', '/series'))}`;
}

export function series(state, query, comic) {
  const marked = state.bookmarks.includes(comic.id);
  const queued = state.queue.includes(comic.id);
  return `<div class="return">${link('‹ Daftar Komik', '/series')}</div><section class="series-intro surface">${cover(comic, false)}<div>
    <p class="meta">${comic.type} · ${comic.genre} · ${comic.status} · ★ ${comic.rating.toFixed(1)}</p>${title(comic.title)}<p>${comic.summary}</p>
    <div class="actions">${link('Mulai baca', chapterUrl(comic.chapters[0]), 'primary')}<button data-toggle="bookmarks" data-id="${comic.id}" aria-pressed="${marked}">${marked ? 'Tersimpan' : 'Bookmark'}</button>
    <button data-toggle="queue" data-id="${comic.id}" aria-pressed="${queued}">${queued ? 'Dalam antrean' : 'Tambah ke antrean'}</button></div></div></section>
    <section><div class="section-heading"><h2>Daftar Chapter</h2><span class="meta">${comic.chapters.length} chapter</span></div>
    <div class="stack">${comic.chapters.slice().reverse().map(ch => `<a class="row" href="${chapterUrl(ch)}"><strong>Chapter ${ch.number}</strong><span>${ch.title}</span><span aria-hidden="true">›</span></a>`).join('')}</div></section>`;
}

export function reader(state, query, comic, chapter) {
  const previous = comic.chapters[chapter.number - 2];
  const next = comic.chapters[chapter.number];
  const script = [
    ['Senja menahan napas.', '“Pulanglah sebelum cahaya itu padam.”', 'Ia berjalan ke arah yang berlawanan.'],
    ['Pagi itu, cakrawala berubah warna.', '“Kau juga melihat tandanya?”', 'Ia mengangkat pedangnya. Kali ini ia tidak sendirian.'],
    ['Tiga langkah sebelum pintu, ia berhenti.', '“Ada hal yang belum kukatakan.”', 'Di seberang jalan, lentera pertama menyala.'],
  ][chapter.number - 1];
  const chapterNav = () => `<nav class="actions chapter-nav" aria-label="Pindah chapter">${previous ? link('‹ Sebelumnya', chapterUrl(previous)) : ''}${link('Daftar Chapter', seriesUrl(comic))}${next ? link('Berikutnya ›', chapterUrl(next), 'primary') : ''}</nav>`;
  return `<article class="reader${state.prefs.wide ? ' wide' : ''}"><p class="meta">${link(comic.title, seriesUrl(comic))}</p>${title(`Chapter ${chapter.number} — ${chapter.title}`)}${chapterNav()}
    <div class="panels">${script.map((line, i) => `<figure><img src="${artwork(comic, 1 + (i + chapter.number - 1) % 3)}" alt="" width="300" height="450"><figcaption>${line}</figcaption></figure>`).join('')}</div>${chapterNav()}</article>`;
}

export function library(state, query) {
  const active = tabIndex(query, 'tab', libraryTabs.length);
  const filter = tabIndex(query, 'filter', 2);
  const recent = new Map();
  if (active === 1) {
    for (const id of state.history) {
      const comic = comics.find(x => x.chapters.some(ch => ch.id === id));
      if (comic && !recent.has(comic)) recent.set(comic, comic.chapters.find(ch => ch.id === id));
    }
  }
  const counts = [`${state.bookmarks.length}`, `${state.history.length}`, `${state.queue.length}/30`];
  let items = active === 1 ? [...recent.keys()] : comics.filter(x => (active === 2 ? state.queue : state.bookmarks).includes(x.id));
  if (filter === 1) items = [...items].sort((a, b) => a.index - b.index);
  const emptyHeads = ['Belum ada bookmark', 'Belum ada riwayat baca', 'Antrean masih kosong'];
  const emptyDesc = ['Simpan manga yang kamu suka supaya gampang dicari lagi nanti.', 'Chapter yang kamu buka akan tercatat di sini.', 'Tambahkan judul ke antrean dari halaman detail komik.'];
  return `${title('Pustaka')}
    <nav class="seg-tabs" aria-label="Pustaka">${libraryTabs.map((label, i) => `<a class="seg-tab${i === active ? ' selected' : ''}" ${i === active ? 'aria-current="page"' : ''} href="${tabHref('/library', 'tab', i)}">${label} <span class="badge-count">${counts[i]}</span></a>`).join('')}</nav>
    <div class="sub-filters">${tabLinks(['Semua', 'Rilis Terbaru'], filter, i => `/library?tab=${active}&filter=${i}`)}</div>
    ${items.length ? `<h2 class="sr-only">${libraryTabs[active]} komik</h2>${active === 1 ? `<div class="stack">${[...recent].map(([comic, chapter]) => `<a class="row" href="${chapterUrl(chapter)}"><strong>${comic.title}</strong><span>Lanjut Chapter ${chapter.number}</span><span aria-hidden="true">›</span></a>`).join('')}</div>` : tiles(items)}` : box(emptyHeads[active], emptyDesc[active], link('Cari manga', '/series', 'primary'))}`;
}

const samplePosts = [
  { id: 'mingguan-2026', category: 1, pinned: true, title: 'Peringkat Mingguan Shinigami 23 November 2026', body: 'Halo semuanya, akhirnya kembali lagi dengan peringkat mingguan. Upvote/Respon ini diambil dari aktivitas pembaca lokal.', author: 'Lexy Melvinger', role: 'GOD', ago: '2 hari lalu' },
  { id: 'rekomendasi-fantasi', category: 3, title: 'Rekomendasi fantasi untuk akhir pekan', body: 'Apa judul dengan dunia paling menarik yang kamu baca minggu ini?', author: 'Tim Lab', ago: '5 jam lalu' },
];
const allPosts = state => [...state.posts, ...samplePosts];
const postRow = post => `<article class="surface post-card">${post.pinned ? '<p class="pin-label">PINNED</p>' : ''}<div class="post-author"><span class="avatar sm" aria-hidden="true">${initials(post.author)}</span><div><strong>${e(post.author)}</strong>${post.role ? ` <span class="role-pill">${post.role}</span>` : ''}</div></div><a href="/community/${post.id}"><h3>${e(post.title)}</h3></a><p class="meta"><span class="cat-pill">${categories[post.category]}</span> · ${post.ago ?? 'Baru saja'}</p><p class="post-excerpt">${e(post.body)}</p></article>`;

export function community(state, query) {
  const active = tabIndex(query, 'kategori', categories.length);
  const search = (query.get('q') ?? '').trim().toLowerCase();
  const posts = allPosts(state).filter(p => (active === 0 || p.category === active) && (!search || p.title.toLowerCase().includes(search) || p.body.toLowerCase().includes(search)));
  return `<div class="community-top">${title('Komunitas')}<form class="community-search" action="/community"><input type="hidden" name="kategori" value="${active}"><label class="sr-only" for="post-q">Cari post</label><input id="post-q" name="q" type="search" value="${e(search)}" placeholder="Cari post..."></form><button type="button" class="primary" data-toggle-composer>+ Tulis post</button></div>
    ${tabLinks(categories, active, i => tabHref('/community', 'kategori', i))}
    <div class="community-layout"><div><p class="meta">${posts.length} post</p>
      <details id="post-composer" class="surface composer"><summary>Tulis post baru</summary><form data-form="post"><label>Judul<input name="title" required maxlength="90"></label>${select('category', 'Kategori', categories.slice(1).map((x, i) => [i + 1, x]), 3)}<label>Isi<textarea name="body" required maxlength="1200"></textarea></label><button class="primary">Terbitkan di demo</button></form></details>
      <div class="stack">${posts.length ? posts.map(postRow).join('') : box('Belum ada post', 'Jadilah yang pertama membuka diskusi.')}</div></div>
    <aside class="stack">
      <section class="surface side user-side-card"><div class="user-side-head"><div class="avatar sm" aria-hidden="true">${initials(state.name)}</div><div><strong>${e(state.name)}</strong><p class="meta">@${handleOf(state.name)} · gabung 2026</p></div></div>${link('Lihat profil', '/user/me', 'primary full')}</section>
      <section class="surface side"><h2>Leaderboard</h2><div class="lb-mini-head meta"><span>RANK · PENGGUNA</span><span>AURA</span></div><div class="stack">${[['Arunika', 1840], ['Sora', 1520], ['Rimba', 1280]].map(([n, s], i) => `<div class="lb-mini-row"><span><b class="points">${i + 1}</b> ${n}</span><span>${s}</span></div>`).join('')}</div>${link('› Lihat leaderboard lengkap', '/leaderboard', 'chip full')}</section>
      <section class="surface side"><h2>Aturan singkat</h2><ol class="rules-list"><li>Tandai spoiler, sebut nomor chapter.</li><li>Tanpa link raw atau bajakan.</li><li>Kritik karyanya, bukan orangnya.</li><li>Satu post per topik, jangan diulang.</li></ol></section></aside></div>`;
}

export function topic(state, query, id) {
  const post = allPosts(state).find(p => p.id === id);
  if (!post) return notFound();
  const replies = state.replies.filter(x => x.topic === id);
  return `<div class="return">${link('‹ Komunitas', '/community')}</div><article class="surface side"><p class="meta">${categories[post.category]} · ${e(post.author)}</p>${title(e(post.title))}<p class="message">${e(post.body)}</p></article>
  <section><h2>Balasan (${replies.length})</h2><div class="stack">${replies.map(x => `<article class="surface side"><strong>${e(x.author)}</strong><p class="message">${e(x.body)}</p></article>`).join('')}</div>
  <form class="surface composer" data-form="reply" data-id="${id}"><label>Balasan<textarea name="body" required maxlength="800"></textarea></label><button class="primary">Kirim balasan</button></form></section>`;
}

export function chat(state, query, room = 'umum', message) {
  const flat = chatGroups.flatMap(g => g[1]);
  const channel = flat.find(([id]) => id === room);
  if (!channel) return notFound();
  const posts = state.chat.filter(x => x.room === room);
  return `<h1 class="sr-only">Ruang Obrolan</h1><div class="surface chat-shell">
    <aside class="chat-sidebar"><div class="chat-back">${link('‹ Ruang Obrolan', '/community', 'meta')}</div>
      ${chatGroups.map(([group, list]) => `<div class="chat-group"><p class="chat-group-label">${group}</p>${list.map(([id, label, locked]) => `<a class="chat-channel${room === id ? ' selected' : ''}" href="/community/chat/${id}" ${room === id ? 'aria-current="page"' : ''}><span># ${label}</span>${locked ? '<span aria-label="Terkunci">🔒</span>' : ''}</a>`).join('')}</div>`).join('')}
    </aside>
    <section class="chat-pane"><header class="chat-pane-head"><strong># ${channel[1]}</strong><span class="meta">Mode lambat · 10 detik</span></header>
      <div class="messages">${posts.length ? posts.map(x => `<article id="${x.id}" class="message${message === x.id ? ' highlighted' : ''}"><strong>${e(x.author)}</strong><p>${e(x.body)}</p></article>`).join('') : '<p class="meta">Belum ada pesan di saluran ini. Mulai obrolan di bawah.</p>'}</div>
      <form class="chat-input-bar" data-form="chat" data-id="${room}"><label class="sr-only" for="chat">Pesan</label><input id="chat" name="body" placeholder="Kirim pesan ke #${channel[1]}..." required maxlength="400"><button class="primary">Kirim</button></form>
    </section></div>`;
}

export function profile(state, query, username) {
  const mine = username === 'me' || username === 'pembaca-lokal' || username === handleOf(state.name);
  if (!mine) return `${title('Profil')}<section class="surface profile"><div class="avatar" aria-hidden="true">◇</div><div><h2>${e(username)}</h2><p class="meta">Tidak ada data profil publik di perangkat ini.</p></div></section>`;
  const tab = tabIndex(query, 'tab', 3);
  const auraPoints = state.history.length * 10;
  const needed = Math.max(0, 500 - auraPoints);
  const items = tab === 1 ? state.posts : tab === 2 ? state.replies : comics.filter(x => state.bookmarks.includes(x.id));
  return `<h1 class="sr-only">Profil</h1>
    <section class="surface profile-hero"><div class="profile-banner"><a class="icon-circle" href="/settings/akun?edit=banner" aria-label="Ubah banner profil">✎</a></div>
      <div class="profile-head"><div class="avatar-wrap"><div class="avatar lg" aria-hidden="true">${initials(state.name)}</div><a class="avatar-edit" href="/settings/akun?edit=avatar" aria-label="Ubah foto profil">✎</a></div>
        <div class="profile-identity"><div class="name-line"><h2>${e(state.name)}</h2><a class="icon-circle sm" href="/settings/akun?edit=name" aria-label="Ubah nama">✎</a></div>
          <div class="name-line"><span class="meta">@${handleOf(state.name)}</span><a class="icon-circle sm" href="/settings/akun?edit=username" aria-label="Ubah username">✎</a></div>
          <p class="meta">Gabung 25 menit lalu</p></div>
        <div class="actions">${link('Ubah avatar', '/settings/akun?edit=avatar')}${link('Pengaturan', '/settings')}</div></div></section>
    <section class="stats-grid" aria-label="Statistik akun">
      <div class="surface stat"><strong class="points">${state.history.length}</strong><span class="meta">Riwayat</span></div>
      <div class="surface stat"><strong class="points">${state.bookmarks.length}</strong><span class="meta">Bookmark</span></div>
      <div class="surface stat"><strong class="points">${state.posts.length}</strong><span class="meta">Postingan</span></div>
      <div class="surface stat"><strong class="points">${state.replies.length}</strong><span class="meta">Komentar</span></div></section>
    <section class="surface upgrade-bar"><div><h2>Naik ke Plus, Pro, atau Max</h2><p class="meta">Tanpa iklan, baca lebih awal, dan Aura kamu dikali sesuai tier.</p></div>${link('Upgrade', '/premium', 'primary')}</section>
    <a class="surface aura-card" href="/sistem-aura"><div class="aura-badge-box" aria-hidden="true">✦</div><div class="aura-content"><div class="aura-top"><span><strong class="points">${auraPoints}</strong> Aura</span><span class="points">Peringkat #0</span></div><div class="aura-bar"><span style="width:${Math.min(100, auraPoints / 5)}%"></span></div><div class="aura-foot"><span class="meta">${needed} aura lagi buat naik ke Hunter E-Rank</span><span aria-hidden="true">›</span></div></div></a>
    <nav class="seg-tabs three" aria-label="Bagian profil">${['Bookmark', 'Postingan', 'Komentar'].map((label, i) => `<a class="seg-tab${i === tab ? ' selected' : ''}" ${i === tab ? 'aria-current="page"' : ''} href="${tabHref('/user/me', 'tab', i)}">${label}</a>`).join('')}</nav>
    ${items.length ? (tab === 0 ? tiles(items) : `<div class="stack">${items.map(x => `<div class="row"><strong>${e(x.title ?? x.body)}</strong><span>${e(x.author)}</span></div>`).join('')}</div>`) : box('Belum ada data', 'Aktivitas lokal untuk bagian ini akan tampil di sini.', link('Jelajahi Komik', '/series', 'primary'))}`;
}

export function leaderboard(state, query) {
  const by = tabIndex(query, 'papan', 3);
  const players = [['Arunika', 1840, '+2'], ['Sora', 1520, '—'], ['Rimba', 1280, '+1'], [state.name, state.history.length * 10, 'Baru']];
  const scale = [1, 3, 12][by];
  return `<div class="section-heading"><div>${title('Leaderboard')}<p class="meta">Pengguna teratas berdasarkan Aura — reputasi yang didapat dari upvote komunitas di komentar.</p></div>${link('Cara kerja Aura ›', '/sistem-aura', 'points')}</div>
    ${tabLinks(groups.slice(1), by, i => tabHref('/leaderboard', 'papan', i))}
    <div class="surface lb-table"><div class="lb-head meta"><span>RANK</span><span>PENGGUNA</span><span>AURA</span><span>PERUBAHAN</span></div>
      ${players.map(([name, score, delta], i) => `<div class="lb-row"><strong class="points">#${i + 1}</strong><span>${e(name)}</span><b>${(score * scale).toLocaleString('id-ID')}</b><span class="meta">${delta}</span></div>`).join('')}</div>`;
}

export function premium(state, query) {
  const annual = query.get('durasi') === 'tahun';
  const prices = annual ? [0, 135000, 270000, 450000] : [0, 15000, 30000, 50000];
  const desc = [
    'Baca semua seri, dengan iklan di sela chapter.',
    'Buat kamu yang baca tiap hari dan mau iklannya hilang.',
    'Aura naik lebih cepat dan avatar kamu dapat Pro Border Avatar.',
    'Pengali aura terbesar, semua fitur premium terbuka.',
  ];
  return `<div class="top-actions">${link('‹', '/', 'chip')}${link('Riwayat order', '/settings/pembayaran', 'chip')}</div>
    <section class="premium-intro"><p class="points eyebrow">SHINIGAMI PREMIUM</p><h1 class="hero-headline">Baca tanpa iklan. Kumpulkan aura sampai <span class="points">10x lebih cepat.</span></h1><p class="meta">Tiga tingkat akses premium, mulai Rp 15.000. Sekali bayar untuk durasi yang kamu pilih, tanpa perpanjangan otomatis dan tanpa tagihan berulang.</p>
      <div class="billing-toggle">${[['Bulanan', 'Coba dulu', '/premium', !annual], ['Tahunan', 'Hemat 25%', '/premium?durasi=tahun', annual]].map(([l, sub, href, on]) => `<a class="bill-btn${on ? ' selected' : ''}" href="${href}"><strong>${l}</strong><small>${sub}</small></a>`).join('')}</div></section>
    <section class="surface current-plan"><div><p class="eyebrow meta">PAKET KAMU SEKARANG</p><strong>Gratis</strong></div><span class="meta">Belum ada paket premium yang aktif.</span></section>
    <div class="plans">${['Gratis', 'Plus', 'Pro', 'Max'].map((name, i) => `<section class="surface side plan${i === 2 ? ' emphasized' : ''}">${i === 2 ? '<span class="popular-pill">Paling populer</span>' : ''}<h2>${name}</h2><p class="meta">${desc[i]}</p><strong class="price">Rp ${prices[i].toLocaleString('id-ID')}</strong><span class="meta">${i === 0 ? 'Selamanya gratis' : annual ? ' / tahun' : ' / bulan'}</span><ul><li>Semua seri terbuka</li><li>${i ? 'Bebas iklan' : 'Iklan di halaman baca'}</li><li>Aura ${[1, 3, 5, 10][i]}×</li></ul>${i ? '<button class="primary full" data-dialog="demo">Pilih paket</button>' : '<p class="points">Paket kamu sekarang</p>'}</section>`).join('')}</div>
    <section class="faq"><h2>Pertanyaan umum</h2>${faq.map(([q, a]) => `<details class="surface side"><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`;
}

export function aura(state, query) {
  const tab = ['aura', 'badge', 'faq'].indexOf(query.get('tab') ?? 'aura');
  const active = tab >= 0 ? tab : 0;
  const rarity = query.get('rarity') ?? 'Semua';
  const auraPoints = state.history.length * 10;
  const needed = Math.max(0, 500 - auraPoints);
  const ranks = [['E', 'Hunter E-Rank', '500 aura'], ['D', 'Hunter D-Rank', '2.000 aura'], ['C', 'Hunter C-Rank', '5.000 aura'], ['B', 'Hunter B-Rank', '12.000 aura'], ['A', 'Hunter A-Rank', '25.000 aura'], ['S', 'Hunter S-Rank', '50.000 aura']];
  let body = '';
  if (active === 0) {
    body = `<section class="surface side"><p class="eyebrow points">AURA</p><h2>Reputasi kamu di Shinigami</h2><p class="meta">Aura nambah tiap komentar atau postingan kamu di-upvote pembaca lain — dikali tier premium kamu.</p><div class="aura-summary"><strong>${auraPoints}</strong><span>Aura</span><span class="meta">${needed} aura lagi buat naik ke Hunter E-Rank</span></div></section>
      <section><h2>Cara dapat Aura</h2><div class="two-col"><div class="surface side"><h3>Komentar kamu di-upvote</h3><p class="meta">Tiap pembaca lain upvote komentar kamu, Aura kamu ikut nambah.</p></div><div class="surface side"><h3>Postingan kamu di-upvote</h3><p class="meta">Tiap pembaca lain upvote postingan kamu, Aura kamu nambah 5x lipat dari upvote komentar.</p></div></div></section>
      <section><div class="section-heading"><h2>Multiplier premium</h2>${link('Lihat paket ›', '/premium', 'points')}</div><div class="three-col">${[['PLUS', '3x', 'Bebas iklan · Basic Border Avatar'], ['PRO', '5x', 'Bebas iklan · Pro Border Avatar'], ['MAX', '10x', 'MAX Border Avatar']].map(([t, m, d]) => `<div class="surface side"><span class="points">${t}</span><strong class="big-mult">${m}</strong><p class="meta">${d}</p></div>`).join('')}</div></section>
      <section><h2>Tangga Aura</h2><div class="stack">${ranks.map(([r, n, req]) => `<div class="row"><strong class="rank-badge">${r}</strong><span>${n}</span><span class="meta">Capai ${req}</span></div>`).join('')}</div></section>`;
  } else if (active === 1) {
    const rarities = ['Semua', 'Common', 'Rare', 'Epic', 'Legendary', 'Mythical'];
    body = `<section class="surface side"><p class="eyebrow points">BADGE</p><h2>Badge &amp; pencapaian</h2><p class="meta">Didapat dari aktivitas, peringkat, dan momen khusus.</p>${tabLinks(rarities, rarities.indexOf(rarity), i => `/sistem-aura?tab=badge&rarity=${rarities[i]}`)}</section>
      ${badgeGroups.map(([name, count, desc, items]) => {
        const filtered = items.filter(([, r]) => rarity === 'Semua' || r.toLowerCase() === rarity.toLowerCase());
        return filtered.length ? `<section class="surface side"><h3>${name} <span class="meta">${count}</span></h3><p class="meta">${desc}</p><div class="stack">${filtered.map(([b, r, d]) => `<div class="row"><strong>${b}</strong><span class="role-pill">${r}</span><span class="meta">${d}</span></div>`).join('')}</div></section>` : '';
      }).join('')}`;
  } else {
    body = `<section class="surface side"><p class="eyebrow points">FAQ</p><h2>Pertanyaan yang sering ditanya</h2><div class="stack">${auraFaq.map(([grp, q, a]) => `<details class="surface side"><summary><span class="meta">${grp}</span> · ${q}</summary><p>${a}</p></details>`).join('')}</div></section>`;
  }
  return `${title('Aura & Badge')}<p class="meta">Cara kerja Aura, semua badge yang bisa kamu kumpulkan, dan jawaban buat pertanyaan yang sering muncul.</p>
    <div class="three-col aura-tabs">${[['Aura', 'Reputasi kamu', 'aura'], ['Badge', '11 contoh badge', 'badge'], ['FAQ', `${auraFaq.length} jawaban`, 'faq']].map(([t, s, key], i) => `<a class="surface side aura-tab${i === active ? ' selected' : ''}" href="/sistem-aura?tab=${key}"><strong>${t}</strong><span class="meta">${s}</span></a>`).join('')}</div>
    ${body}`;
}

export function guide(state, query, id) {
  const article = id && guides.find(([key]) => key === id);
  if (id && !article) return notFound();
  if (article) return `<div class="return">${link('‹ Panduan', '/panduan')}</div>${title(article[1])}<div class="surface side"><p class="meta">${article[2]}</p><p>${article[4]}</p></div>`;
  const q = (query.get('q') ?? '').trim().toLowerCase();
  const list = guides.filter(([, label, desc]) => !q || label.toLowerCase().includes(q) || desc.toLowerCase().includes(q));
  return `<div class="title-back">${link('‹', '/', 'chip')}${title('Panduan')}</div><p class="meta">Cara pakai Shinigami, dari baca chapter sampai bayar Premium.</p>
    <form class="guide-search" action="/panduan"><label class="sr-only" for="guide-q">Cari panduan</label><input id="guide-q" name="q" type="search" value="${e(q)}" placeholder="Cari panduan..."></form>
    <div class="three-col">${list.map(([slug, label, desc, count]) => `<a class="surface side guide-card${slug === 'premium' ? ' emphasized' : ''}" href="/panduan/${slug}"><h3>${label}</h3><p class="meta">${desc}</p><span class="points">${count}</span></a>`).join('')}</div>
    <section><h2>Paling sering dicari</h2><div class="two-col">${[['Cara bayar Premium', 'Premium', '/panduan/premium'], ['Kenapa belum bisa kasih rating?', 'Detail komik', '/panduan/detail-komik'], ['Cara dapat Aura', 'Profil & akun', '/sistem-aura'], ['Mode baca Gulir vs Halaman', 'Halaman baca', '/panduan/halaman-baca']].map(([t, cat, href]) => `<a class="row" href="${href}"><strong>${t}</strong><span class="meta">${cat} ›</span></a>`).join('')}</div></section>`;
}

export function notifications(state, query) {
  const active = tabIndex(query, 'kat', notifTabs.length);
  const unreadOnly = query.get('unread') === '1';
  const items = (state.prefs.alerts ? state.notices : []).map((text, idx) => ({ text, idx, cat: idx === 0 ? 1 : 2 }));
  const filtered = items.filter(x => (active === 0 || x.cat === active) && (!unreadOnly || true));
  return `<div class="section-heading"><div class="title-back">${link('‹ Kembali', '/', 'chip')}${title('Notifikasi')}</div><button data-clear="notices">Semua sudah dibaca</button></div>
    <div class="section-heading">${tabLinks(notifTabs, active, i => `/notifikasi?kat=${i}${unreadOnly ? '&unread=1' : ''}`)}${link(unreadOnly ? 'Semua status' : 'Belum dibaca saja', `/notifikasi?kat=${active}${unreadOnly ? '' : '&unread=1'}`)}</div>
    <section class="surface side notif-banner"><div><strong>Aktifkan notifikasi lokal</strong><p class="meta">Pemberitahuan aktivitas baca &amp; posting disimpan di browser ini.</p></div>${link('Atur', '/settings/notifikasi', 'primary')}</section>
    ${filtered.length ? `<section><h2>Hari ini</h2><div class="stack">${filtered.map(n => `<div class="surface notif-row"><div class="notif-thumb">${cover(comics[n.idx % comics.length])}</div><div><strong>${e(n.text)}</strong><p class="meta">Baru saja</p></div>${link('Baca', '/series/' + comics[n.idx % comics.length].id)}</div>`).join('')}</div></section>` : box('Belum ada notifikasi', 'Pemberitahuan aktivitas lokal akan tampil di sini.', link('Preferensi notifikasi', '/settings/notifikasi'))}`;
}

export function preferences(state, query, section = 'akun') {
  const active = settingsMenu.findIndex(([key]) => key === section);
  if (active < 0) return notFound();
  const p = state.prefs;
  const sidebar = `<aside class="settings-nav"><h2 class="sr-only">Kategori pengaturan</h2>${settingsMenu.map(([key, label, desc]) => `<a class="surface settings-link${key === section ? ' selected' : ''}" href="/settings/${key}"><strong>${label}</strong><small class="meta">${desc}</small></a>`).join('')}<a class="surface settings-link" href="/panduan"><strong>Panduan</strong><small class="meta">Cara pakai fitur Shinigami</small></a></aside>`;
  let body = '';
  if (section === 'akun') {
    body = `<div class="stack">
      <div class="surface row"><div><strong>Foto profil</strong><p class="meta">JPG, PNG atau WebP, maks 5 MB</p></div>${link('Ganti', '/settings/akun?edit=avatar')}</div>
      <div class="surface row"><div><strong>Avatar &amp; bingkai</strong><p class="meta">Inisial ${initials(state.name)} · Tanpa bingkai</p></div>${link('Pilih', '/sistem-aura?tab=badge')}</div>
      <div class="surface row"><div><strong>Banner profil</strong><p class="meta">JPG atau PNG, rasio 3:1, maksimal 4 MB</p></div>${link('Ganti', '/settings/akun?edit=banner')}</div>
      <form data-form="preferences" data-id="akun" class="surface side stack"><label>Nama tampilan<input name="name" required maxlength="36" value="${e(state.name)}"></label><p class="meta">Username lokal: @${handleOf(state.name)}</p><button class="primary">Simpan nama</button></form>
      <div class="surface row"><div><strong>Klaim akun lama</strong><p class="meta">Pindahin riwayat, bookmark, dan komentar dari akun lama kamu</p></div>${link('Buka', '/settings/akun/klaim')}</div></div>`;
  } else if (section === 'baca') {
    body = `<form data-form="preferences" data-id="baca" class="surface side stack">
      <p class="eyebrow meta">MODE BACA</p><div class="three-col">${['Gulir', 'Halaman', 'Dua halaman'].map((m, i) => `<label class="surface mode-opt"><input type="radio" name="mode" value="${m}"${(p.mode ?? 'Gulir') === m ? ' checked' : ''}><span>${m}</span></label>`).join('')}</div>
      <p class="meta">Komik format Manhwa/Manhua cuma bisa dibaca mode Gulir.</p>
      <p class="eyebrow meta">LEBAR HALAMAN</p>${toggle('wide', 'Lebar', p.wide, 'Gunakan lebar halaman pembaca ekstra')}
      <p class="eyebrow meta">LANJUT OTOMATIS</p>${toggle('autonext', 'Infinity Chapter', p.autonext, 'Abis chapter ini, lanjut sendiri ke chapter berikutnya')}
      <button class="primary">Simpan preferensi baca</button></form>`;
  } else if (section === 'notifikasi') {
    body = `<form data-form="preferences" data-id="notifikasi" class="surface side stack">${toggle('alerts', 'Semua notifikasi', p.alerts, 'Setelan dasar buat semua notifikasi aktivitas lokal')}<button class="primary">Simpan preferensi notifikasi</button></form>`;
  } else if (section === 'privasi') {
    body = `<div class="surface side stack"><p>Riwayat, profil, dan aktivitas ini disimpan di browser. Data tidak dikirim ke layanan luar.</p><button type="button" data-clear="history">Hapus riwayat baca</button></div>`;
  } else if (section === 'selera') {
    body = `<form data-form="preferences" data-id="selera" class="surface side stack">
      ${select('taste', 'Jenis komik favorit', [['', 'Semua jenis'], ...types.map(x => [x, x])], p.taste)}
      <p class="eyebrow meta">GENRE</p><div class="genre-chips">${allGenres.map(g => `<label class="genre-chip"><input type="checkbox" name="genres" value="${g}"${(p.genres ?? []).includes(g) ? ' checked' : ''}><span>${g}</span></label>`).join('')}</div>
      <button class="primary">Simpan selera baca</button></form>`;
  } else {
    body = `<div class="stack"><section class="surface side"><div><p class="eyebrow meta">PAKET KAMU SEKARANG</p><h2>Gratis</h2><p class="meta">Belum ada paket premium yang aktif.</p></div>${link('Lihat paket', '/settings/upgrade', 'primary')}</section>${box('Belum ada pembayaran', 'Order yang kamu buat dari halaman Premium bakal muncul di sini.')}</div>`;
  }
  return `${title('Pengaturan')}<div class="settings-layout">${sidebar}<section aria-label="${settingsMenu[active][1]}">${body}</section></div>`;
}

export function claim() {
  return `${title('Klaim Akun')}${box('Akun demo lokal', 'Replika ini tidak meminta kata sandi, kode klaim, atau akses ke akun Shinigami resmi.', link('Kelola profil lokal', '/settings/akun', 'primary'))}`;
}

export function onboarding(state, query, step) {
  const second = step === 'selera';
  if (step && step !== 'profil' && !second) return notFound();
  return `${title(second ? 'Pilih selera baca' : 'Mulai membaca')}<form class="surface composer" data-form="onboarding" data-id="${second ? 'selera' : 'akun'}"><p class="meta">Langkah ${second ? '2 dari 2' : '1 dari 2'}</p>${second ? select('taste', 'Jenis komik favorit', [['', 'Semua jenis'], ...types.map(x => [x, x])], state.prefs.taste) : `<label>Nama tampilan<input name="name" required maxlength="36" value="${e(state.name)}"></label>`}<button class="primary">${second ? 'Selesai' : 'Lanjut'}</button></form>`;
}

export function notFound() {
  return `${title('Halaman tidak ditemukan')}${box('Tidak ada di katalog ini', 'Alamat ini tidak cocok dengan halaman atau konten yang tersedia di replika lokal.', link('Kembali ke beranda', '/', 'primary'))}`;
}
