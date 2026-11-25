import { artwork, chapterUrl, comics, escape as e, genres, seriesUrl, types } from './catalog.js';

const groups = ['Rekomendasi', 'Rank Harian', 'Rank Mingguan', 'Rank All Time'];
const libraryTabs = ['Bookmark', 'Riwayat', 'Antrean'];
const categories = ['Semua', 'Pengumuman', 'Info Komik', 'Ruang Diskusi', 'Spoiler', 'Polling', 'Review'];
const settings = [['akun', 'Akun'], ['baca', 'Baca'], ['notifikasi', 'Notifikasi'], ['privasi', 'Privasi'], ['selera', 'Selera'], ['pembayaran', 'Pembayaran']];
const rooms = [['umum', 'Obrolan umum'], ['rekomendasi', 'Rekomendasi'], ['spoiler', 'Spoiler']];
const faq = [
  ['Ini langganan atau sekali bayar?', 'Paket referensi ditawarkan untuk durasi tertentu. Pembelian tidak tersedia di replika lokal.'],
  ['Apa itu Aura Multiplier?', 'Pengali menentukan jumlah aura yang didapat dari kegiatan yang sama.'],
  ['Apa bedanya Plus, Pro, dan Max?', 'Perbedaan utamanya adalah pengali aura dan jenis bingkai profil.'],
];
export const guides = [
  ['mulai-membaca', 'Mulai membaca', 'Buka Komik, pilih judul, lalu buka chapter. Chapter terakhir yang dibuka muncul di Riwayat.'],
  ['pustaka', 'Mengelola Pustaka', 'Simpan judul sebagai Bookmark atau masukkan ke Antrean dari halaman detail. Klik tombol yang sama untuk menghapusnya.'],
  ['aturan-komunitas', 'Aturan komunitas', 'Beri tanda spoiler dan sebutkan chapter. Diskusikan karyanya, hindari serangan pribadi, dan jangan mengulang kiriman.'],
];

export const tabLinks = (labels, active, url) => `<nav class="tabs" aria-label="Tampilan">${labels.map((label, i) => `<a class="chip${i === active ? ' selected' : ''}" ${i === active ? 'aria-current="page"' : ''} href="${url(i)}">${label}</a>`).join('')}</nav>`;
const tabHref = (base, key, index) => index ? `${base}?${key}=${index}` : base;
const tabIndex = (query, name, limit) => { const n = Number(query.get(name)); return Number.isInteger(n) && n >= 0 && n < limit ? n : 0; };
const cover = (comic, lazy = true) => `<img class="cover" src="${artwork(comic)}" alt="" width="300" height="450"${lazy ? ' loading="lazy"' : ''}>`;
const title = text => `<h1 class="page-title">${text}</h1>`;
const box = (head, text, action = '') => `<section class="empty surface"><h2>${head}</h2><p>${text}</p>${action}</section>`;
const link = (text, href, className = 'chip') => `<a class="${className}" href="${href}">${text}</a>`;
const intro = '<small class="local-note">Demo lokal · tidak terhubung ke layanan resmi</small>';
const select = (id, label, values, selected) => `<label>${label}<select name="${id}">${values.map(([value, text]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
const toggle = (name, label, checked) => `<label class="check"><input name="${name}" type="checkbox"${checked ? ' checked' : ''}> ${label}</label>`;

function tiles(items, chapters = false) {
  return `<div class="grid">${items.map(comic => `<article class="tile"><a href="${seriesUrl(comic)}">${cover(comic)}<h3>${comic.title}</h3></a>${chapters ? `<div class="chapter-pills">${comic.chapters.slice(-2).reverse().map(ch => link(`Chapter ${ch.number}`, chapterUrl(ch))).join('')}</div>` : `<p class="meta">${comic.type} · ${comic.genre} <span>★ ${comic.rating.toFixed(1)}</span></p>`}</article>`).join('')}</div>`;
}

export function home(state, query) {
  const hero = [comics[4], comics[8], comics[9], comics[5], comics[0], comics[7], comics[6]];
  const active = tabIndex(query, 'rank', groups.length);
  const filtered = tabIndex(query, 'jenis', types.length + 1);
  const ranked = [...comics];
  if (active === 0 && state.prefs.taste) ranked.sort((a,b) => Number(b.type === state.prefs.taste) - Number(a.type === state.prefs.taste));
  if (active === 1) ranked.sort((a,b) => a.index % 3 - b.index % 3);
  if (active === 2) ranked.reverse();
  if (active === 3) ranked.sort((a,b) => b.rating - a.rating);
  const items = filtered ? comics.filter(x => x.type === types[filtered - 1]) : comics;
  return `<h1 class="sr-only">Beranda</h1><section class="hero" aria-label="Komik unggulan">
    <div class="hero-track">${hero.map((comic, i) => `<a class="hero-cover${i === 3 ? ' featured' : ''}" href="${seriesUrl(comic)}" aria-label="${comic.title}, rating ${comic.rating.toFixed(1)}">${cover(comic, false)}<span class="rating">★ ${comic.rating.toFixed(1)}</span><strong>${comic.title}</strong></a>`).join('')}</div>
    <button class="hero-arrow prev" data-slide="-1" aria-label="Unggulan sebelumnya">‹</button><button class="hero-arrow next" data-slide="1" aria-label="Unggulan berikutnya">›</button></section>
    <section class="rank-section"><h2 class="sr-only">Peringkat komik</h2>${tabLinks(groups, active, i => { const q = new URLSearchParams(query); q.set('rank', i); return `/?${e(q)}#rank`; })}
    <div id="rank" class="rank-track" tabindex="0" aria-label="Daftar peringkat">${ranked.slice(0, 9).map((comic, i) => `<a class="rank-card" href="${seriesUrl(comic)}">${cover(comic)}<div class="rank-meta"><b>${i + 1}</b><div><strong>${comic.title}</strong><small>Ch. ${comic.chapters.length} · ${i + 1} jam</small></div></div></a>`).join('')}</div>
    <div class="rail-actions"><button data-rail="-1" aria-label="Peringkat sebelumnya">‹</button><button data-rail="1" aria-label="Peringkat berikutnya">›</button></div></section>
    <section id="project"><div class="section-heading"><h2>Project</h2>${tabLinks(['Semua', ...types], filtered, i => { const q = new URLSearchParams(query); q.set('jenis', i); return `/?${e(q)}#project`; })}</div>${tiles(items, true)}</section>`;
}

export function catalog(state, query) {
  const keyword = (query.get('q') ?? '').slice(0, 100).trim();
  const type = query.get('type') ?? '';
  const genre = query.get('genre') ?? '';
  const sort = query.get('sort') ?? '';
  const list = comics.filter(x => (!type || x.type === type) && (!genre || x.genre === genre) && x.title.toLowerCase().includes(keyword.toLowerCase()));
  if (sort === 'rating') list.sort((a,b) => b.rating - a.rating);
  if (sort === 'name') list.sort((a,b) => a.title.localeCompare(b.title, 'id'));
  return `${title('Daftar Komik')}<form class="filters surface" action="/series">
    <label>Cari judul<input name="q" type="search" value="${e(keyword)}" maxlength="100" placeholder="Cari komik…"></label>
    ${select('type', 'Jenis', [['', 'Semua jenis'], ...types.map(x => [x,x])], type)}
    ${select('genre', 'Genre', [['', 'Semua genre'], ...genres.map(x => [x,x])], genre)}
    ${select('sort', 'Urutan', [['','Update terbaru'],['rating','Rating tertinggi'],['name','Judul A–Z']], sort)}
    <button class="primary">Filter</button>${link('Reset', '/series')}</form>
    ${list.length ? `<h2 class="sr-only">Hasil pencarian</h2>${tiles(list)}` : box('Tidak ada hasil', 'Coba kata kunci atau filter lain.', link('Lihat semua komik','/series'))}`;
}

export function series(state, query, comic) {
  const marked = state.bookmarks.includes(comic.id);
  const queued = state.queue.includes(comic.id);
  return `<div class="return">${link('‹ Daftar Komik', '/series')}</div><section class="series-intro surface">${cover(comic, false)}<div>
    <p class="meta">${comic.type} · ${comic.genre} · ★ ${comic.rating.toFixed(1)}</p>${title(comic.title)}<p>${comic.summary}</p>
    <div class="actions">${link('Mulai baca', chapterUrl(comic.chapters[0]), 'primary')}<button data-toggle="bookmarks" data-id="${comic.id}" aria-pressed="${marked}">${marked ? 'Tersimpan' : 'Bookmark'}</button>
    <button data-toggle="queue" data-id="${comic.id}" aria-pressed="${queued}">${queued ? 'Dalam antrean' : 'Tambah ke antrean'}</button></div></div></section>
    <section><div class="section-heading"><h2>Daftar Chapter</h2><span class="meta">${comic.chapters.length} chapter</span></div>
    <div class="stack">${comic.chapters.slice().reverse().map(ch => `<a class="row" href="${chapterUrl(ch)}"><strong>Chapter ${ch.number}</strong><span>${ch.title}</span><span aria-hidden="true">›</span></a>`).join('')}</div></section>`;
}

export function reader(state, query, comic, chapter) {
  const previous = comic.chapters[chapter.number - 2];
  const next = comic.chapters[chapter.number];
  const script = [
    ['Senja menahan napas.','“Pulanglah sebelum cahaya itu padam.”','Ia berjalan ke arah yang berlawanan.'],
    ['Pagi itu, cakrawala berubah warna.','“Kau juga melihat tandanya?”','Ia mengangkat pedangnya. Kali ini ia tidak sendirian.'],
    ['Tiga langkah sebelum pintu, ia berhenti.','“Ada hal yang belum kukatakan.”','Di seberang jalan, lentera pertama menyala.'],
  ][chapter.number - 1];
  const chapterNav = () => `<nav class="actions chapter-nav" aria-label="Pindah chapter">${previous ? link('‹ Sebelumnya', chapterUrl(previous)) : ''}${link('Daftar Chapter', seriesUrl(comic))}${next ? link('Berikutnya ›', chapterUrl(next), 'primary') : ''}</nav>`;
  return `<article class="reader${state.prefs.wide ? ' wide' : ''}"><p class="meta">${link(comic.title, seriesUrl(comic))}</p>${title(`Chapter ${chapter.number} — ${chapter.title}`)}${chapterNav()}
    <div class="panels">${script.map((line, i) => `<figure><img src="${artwork(comic, 1 + (i + chapter.number - 1) % 3)}" alt="" width="300" height="450"><figcaption>${line}</figcaption></figure>`).join('')}</div>${chapterNav()}</article>`;
}

export function library(state, query) {
  const active = tabIndex(query, 'tab', libraryTabs.length);
  const recent = new Map();
  if (active === 1) {
    for (const id of state.history) {
      const comic = comics.find(x => x.chapters.some(ch => ch.id === id));
      if (comic && !recent.has(comic)) recent.set(comic, comic.chapters.find(ch => ch.id === id));
    }
  }
  const items = active === 1 ? [...recent.keys()] : comics.filter(x => (active === 2 ? state.queue : state.bookmarks).includes(x.id));
  return `${title('Pustaka')}${tabLinks(libraryTabs, active, i => tabHref('/library','tab',i))}${active === 2 ? `<p class="meta">${state.queue.length}/30</p>` : ''}
    ${items.length ? `<h2 class="sr-only">${libraryTabs[active]} komik</h2>${active === 1 ? `<div class="stack">${[...recent].map(([comic, chapter]) => `<a class="row" href="${chapterUrl(chapter)}"><strong>${comic.title}</strong><span>Lanjut Chapter ${chapter.number}</span><span aria-hidden="true">›</span></a>`).join('')}</div>` : tiles(items)}` : box(`${libraryTabs[active]} masih kosong`, 'Pilih dan baca komik untuk mengisi pustaka di perangkat ini.', link('Jelajahi Komik','/series','primary'))}`;
}

const samplePosts = [
  { id: 'selamat-datang', category: 1, title: 'Selamat datang di ruang baca', body: 'Perkenalkan diri dan ceritakan komik yang sedang kamu baca.', author: 'Tim Lab' },
  { id: 'rekomendasi-fantasi', category: 3, title: 'Rekomendasi fantasi untuk akhir pekan', body: 'Apa judul dengan dunia paling menarik yang kamu baca minggu ini?', author: 'Tim Lab' },
];
const allPosts = state => [...state.posts, ...samplePosts];
const postRow = post => `<a class="row" href="/community/${post.id}"><strong>${e(post.title)}</strong><span>${categories[post.category]} · ${e(post.author)}</span><span>›</span></a>`;

export function community(state, query) {
  const active = tabIndex(query, 'kategori', categories.length);
  const posts = allPosts(state).filter(p => active === 0 || p.category === active);
  return `${title('Komunitas')}<div class="community-layout"><div>${tabLinks(categories, active, i => tabHref('/community','kategori',i))}<div class="section-heading"><span class="meta">${posts.length} post</span>${link('Ruang Obrolan', '/community/chat')}</div>
    <details class="surface composer"><summary>Tulis post</summary><form data-form="post"><label>Judul<input name="title" required maxlength="90"></label>${select('category', 'Kategori', categories.slice(1).map((x,i) => [i+1,x]), 3)}<label>Isi<textarea name="body" required maxlength="1200"></textarea></label><button class="primary">Terbitkan di demo</button></form></details>
    <div class="stack">${posts.length ? posts.map(postRow).join('') : box('Belum ada post', 'Jadilah yang pertama membuka diskusi.')}</div></div>
    <aside class="stack"><section class="surface side"><h2>Leaderboard</h2><p class="meta">RANK · PENGGUNA · AURA</p>${link('Lihat leaderboard lengkap','/leaderboard')}</section>
    <section class="surface side"><h2>Aturan singkat</h2><ol><li>Tandai spoiler dan sebut nomor chapter.</li><li>Tanpa tautan bajakan.</li><li>Kritik karyanya, bukan orangnya.</li><li>Satu post per topik.</li></ol></section></aside></div>`;
}

export function topic(state, query, id) {
  const post = allPosts(state).find(p => p.id === id);
  if (!post) return notFound();
  const replies = state.replies.filter(x => x.topic === id);
  return `<div class="return">${link('‹ Komunitas','/community')}</div><article class="surface side"><p class="meta">${categories[post.category]} · ${e(post.author)}</p>${title(e(post.title))}<p class="message">${e(post.body)}</p></article>
  <section><h2>Balasan (${replies.length})</h2><div class="stack">${replies.map(x => `<article class="surface side"><strong>${e(x.author)}</strong><p class="message">${e(x.body)}</p></article>`).join('')}</div>
  <form class="surface composer" data-form="reply" data-id="${id}"><label>Balasan<textarea name="body" required maxlength="800"></textarea></label><button class="primary">Kirim balasan</button></form></section>`;
}

export function chat(state, query, room = 'umum', message) {
  const channel = rooms.find(([id]) => id === room);
  if (!channel) return notFound();
  const posts = state.chat.filter(x => x.room === room);
  return `${title('Ruang Obrolan')}<p class="meta">Pesan tersimpan pada perangkat ini saja.</p><div class="community-layout"><section class="surface side"><h2>${channel[1]}</h2><div class="messages">${posts.length ? posts.map(x => `<article id="${x.id}" class="message${message === x.id ? ' highlighted' : ''}"><strong>${e(x.author)}</strong><p>${e(x.body)}</p></article>`).join('') : '<p class="meta">Belum ada pesan.</p>'}</div><form class="inline-form" data-form="chat" data-id="${room}"><label class="sr-only" for="chat">Pesan</label><input id="chat" name="body" placeholder="Tulis pesan…" required maxlength="400"><button class="primary">Kirim</button></form></section>
    <aside class="surface side"><h2>Saluran</h2><div class="stack">${rooms.map(([id, label]) => `<a class="row${room === id ? ' selected' : ''}" href="/community/chat/${id}" ${room === id ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</div></aside></div>`;
}

export function profile(state, query, username) {
  const mine = username === 'me' || username === 'pembaca-lokal';
  if (!mine) return `${title('Profil')}<section class="surface profile"><div class="avatar" aria-hidden="true">◇</div><div><h2>${e(username)}</h2><p class="meta">Tidak ada data profil publik di perangkat ini.</p></div></section>`;
  const tab = tabIndex(query, 'tab', 3);
  const auraPoints = state.history.length * 10;
  const needed = Math.max(0, 500 - auraPoints);
  const items = tab === 1 ? state.posts : tab === 2 ? state.replies : comics.filter(x => state.bookmarks.includes(x.id));
  return `<h1 class="sr-only">Profil</h1>
    <section class="surface profile-hero"><div class="profile-banner">${link('Ubah banner','/settings/akun?edit=banner','chip')}</div>
      <div class="profile-head"><div class="avatar" aria-hidden="true">${e(state.name.slice(0,1).toUpperCase())}</div>
        <div><h2>${e(state.name)}</h2><p class="meta">@${e(state.name.toLowerCase().replace(/[^a-z0-9]+/g,'') || 'pembaca')} · Pembaca lokal</p></div>
        <div class="actions">${link('Ubah avatar','/settings/akun?edit=avatar')}${link('Pengaturan','/settings')}</div></div></section>
    <section class="stats-grid" aria-label="Statistik akun">
      <div class="surface stat"><strong>${state.history.length}</strong><span class="meta">Riwayat</span></div>
      <div class="surface stat"><strong>${state.bookmarks.length}</strong><span class="meta">Bookmark</span></div>
      <div class="surface stat"><strong>${state.posts.length}</strong><span class="meta">Postingan</span></div>
      <div class="surface stat"><strong>${state.replies.length}</strong><span class="meta">Komentar</span></div></section>
    <section class="surface upgrade-bar"><div><h2>Naik ke Plus, Pro, atau Max</h2><p class="meta">Tanpa iklan, baca lebih awal, dan Aura kamu dikali sesuai tier.</p></div>${link('Upgrade','/premium','primary')}</section>
    <a class="surface aura-card" href="/sistem-aura"><div class="aura-top"><strong><span class="points">${auraPoints}</span> Aura</strong><span class="points">Peringkat #0</span></div><div class="aura-bar"><span style="width:${Math.min(100, auraPoints / 5)}%"></span></div><p class="meta">${needed} aura lagi buat naik ke Hunter E-Rank ›</p></a>
    ${tabLinks(['Bookmark', 'Postingan', 'Komentar'], tab, i => tabHref('/user/me', 'tab', i))}
    ${items.length ? (tab === 0 ? tiles(items) : `<div class="stack">${items.map(x => `<div class="row"><strong>${e(x.title ?? x.body)}</strong><span>${e(x.author)}</span></div>`).join('')}</div>`) : box('Belum ada data', 'Aktivitas lokal untuk bagian ini akan tampil di sini.', link('Jelajahi Komik','/series','primary'))}`;
}

export function leaderboard(state, query) {
  const by = tabIndex(query, 'papan', 3);
  const players = [['Arunika', 1840], ['Sora', 1520], ['Rimba', 1280], [state.name, state.history.length * 10]];
  const scale = [1,3,12][by];
  return `${title('Leaderboard')}${tabLinks(groups.slice(1), by, i => tabHref('/leaderboard','papan',i))}<div class="stack">${players.map(([name, score], i) => `<div class="row"><strong class="points">${i + 1}</strong><span>${e(name)}</span><b>${(score * scale).toLocaleString('id-ID')} Aura</b></div>`).join('')}</div>${intro}`;
}

export function premium(state, query) {
  const annual = query.get('durasi') === 'tahun';
  const prices = annual ? [0,135000,270000,450000] : [0,15000,30000,50000];
  return `<section class="premium-intro"><p class="points">SHINIGAMI LAB · PREMIUM</p>${title('Baca tanpa iklan. Kumpulkan aura lebih cepat.')}<p>Tiga tingkat akses premium. Bandingkan paket bulanan dan tahunan; tidak ada penagihan di demo lokal.</p>${tabLinks(['Bulanan', 'Tahunan'], Number(annual), i => i ? '/premium?durasi=tahun' : '/premium')}</section><div class="plans">${['Gratis','Plus','Pro','Max'].map((name,i) => `<section class="surface side plan${i === 2 ? ' emphasized' : ''}"><h2>${name}</h2><strong class="price">Rp ${prices[i].toLocaleString('id-ID')}</strong><span class="meta">${i === 0 ? 'Selamanya gratis' : annual ? ' / tahun' : ' / bulan'}</span><ul><li>Akses katalog komik</li><li>${i ? 'Bebas iklan' : 'Baca dengan iklan'}</li><li>Aura ${[1,3,5,10][i]}×</li></ul>${i ? '<button data-dialog="demo">Detail pembelian</button>' : '<p class="points">Paket saat ini</p>'}</section>`).join('')}</div><section class="faq"><h2>Pertanyaan umum</h2>${faq.map(([q,a]) => `<details class="surface side"><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`;
}

export function aura(state) {
  return `${title('Sistem Aura & Badge')}<section class="surface side"><h2>Aura kamu: <span class="points">${state.history.length * 10}</span></h2><p>Di demo ini, setiap chapter baru yang dibuka menambah 10 aura.</p>${link('Lihat Leaderboard','/leaderboard','primary')}</section><section><h2>Pencapaian</h2><div class="stack">${[[10,'Pembaca Pemula'],[50,'Penjelajah Katalog'],[100,'Penjaga Pustaka']].map(([n,label]) => `<div class="row"><strong>${label}</strong><span>${n} Aura</span><span>${state.history.length * 10 >= n ? 'Terbuka' : 'Terkunci'}</span></div>`).join('')}</div></section>`;
}

export function guide(state, query, id) {
  const article = id && guides.find(([key]) => key === id);
  if (id && !article) return notFound();
  return article ? `<div class="return">${link('‹ Panduan','/panduan')}</div>${title(article[1])}<div class="surface side"><p>${article[2]}</p></div>` : `${title('Panduan')}<div class="stack">${guides.map(([slug,label]) => `<a class="row" href="/panduan/${slug}"><strong>${label}</strong><span>›</span></a>`).join('')}</div>`;
}

export function notifications(state) {
  const events = state.prefs.alerts ? state.notices : [];
  return `${title('Notifikasi')}${events.length ? `<div class="actions"><button data-clear="notices">Hapus daftar notifikasi</button></div><div class="stack">${events.map(x => `<div class="row">${e(x)}</div>`).join('')}</div>` : box('Belum ada notifikasi', 'Pemberitahuan aktivitas lokal akan tampil di sini.', link('Preferensi notifikasi','/settings/notifikasi'))}`;
}

export function preferences(state, query, section = 'akun') {
  const active = settings.findIndex(([key]) => key === section);
  if (active < 0) return notFound();
  const p = state.prefs;
  const fields = {
    akun: `<label>Nama tampilan<input name="name" required maxlength="36" value="${e(state.name)}"></label>${link('Klaim akun','/settings/akun/klaim')}`,
    baca: toggle('wide', 'Gunakan tampilan pembaca lebar', p.wide),
    notifikasi: toggle('alerts', 'Tampilkan notifikasi aktivitas lokal', p.alerts),
    privasi: '<p>Riwayat, profil, dan aktivitas ini disimpan di browser. Data tidak dikirim ke layanan luar.</p><button type="button" data-clear="history">Hapus riwayat baca</button>',
    selera: select('taste', 'Jenis komik favorit', [['','Semua jenis'], ...types.map(x => [x,x])], p.taste),
    pembayaran: `<p>Tidak ada metode pembayaran tersimpan atau transaksi di demo lokal.</p>${link('Bandingkan paket','/settings/upgrade')}`,
  };
  return `${title('Pengaturan')}${tabLinks(settings.map(x => x[1]), active, i => `/settings/${settings[i][0]}`)}<form data-form="preferences" data-id="${section}" class="surface composer"><h2>${settings[active][1]}</h2>${fields[section]}${['akun','baca','notifikasi','selera'].includes(section) ? '<button class="primary">Simpan perubahan</button>' : ''}</form>`;
}

export function claim() {
  return `${title('Klaim Akun')}${box('Akun demo lokal', 'Replika ini tidak meminta kata sandi, kode klaim, atau akses ke akun Shinigami resmi.', link('Kelola profil lokal','/settings/akun','primary'))}`;
}

export function onboarding(state, query, step) {
  const second = step === 'selera';
  if (step && step !== 'profil' && !second) return notFound();
  return `${title(second ? 'Pilih selera baca' : 'Mulai membaca')}<form class="surface composer" data-form="onboarding" data-id="${second ? 'selera' : 'akun'}"><p class="meta">Langkah ${second ? '2 dari 2' : '1 dari 2'}</p>${second ? select('taste','Jenis komik favorit',[['','Semua jenis'], ...types.map(x => [x,x])],state.prefs.taste) : `<label>Nama tampilan<input name="name" required maxlength="36" value="${e(state.name)}"></label>`}<button class="primary">${second ? 'Selesai' : 'Lanjut'}</button></form>`;
}

export function notFound() {
  return `${title('Halaman tidak ditemukan')}${box('Tidak ada di katalog ini', 'Alamat ini tidak cocok dengan halaman atau konten yang tersedia di replika lokal.', link('Kembali ke beranda','/','primary'))}`;
}
