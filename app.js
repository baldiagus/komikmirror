import { allGenres, comics, seriesUrl, types } from './catalog.js';
import * as pages from './pages.js';

const storageKey = 'shinigami-lab-v1';
const defaults = { bookmarks: [], queue: [], history: [], notices: [], posts: [], replies: [], chat: [], name: 'Pembaca Lokal', prefs: { wide: false, alerts: true, taste: '', mode: 'Gulir', autonext: false, genres: [] } };
const query = new URLSearchParams(location.search);
const root = document.querySelector('#app');
const nav = [['Komik', '/series'], ['Pustaka', '/library'], ['Komunitas', '/community'], ['Premium', '/premium']];
const svg = path => `<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
const searchIcon = svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>');
const chatIcon = svg('<path d="M20 11.5a8 8 0 0 1-8 8 8 8 0 0 1-3.4-.8L4 20l1.3-4.6A8 8 0 1 1 20 11.5Z"/>');
const bellIcon = svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>');
const mark = `<a class="brand" href="/" aria-label="Shinigami S1, beranda">${svg('<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8.5 15c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5"/>')}<span>SHINIGAMI</span><b>S1</b></a>`;
const appUrl = location.pathname.replace(/\/+$/, '') || '/';
const idPattern = /^[a-z0-9-]{1,80}$/;
const strings = (candidate, limit = Infinity) => Array.isArray(candidate) ? candidate.filter(x => typeof x === 'string').slice(0, limit) : [];
const records = (candidate, predicate) => Array.isArray(candidate) ? candidate.filter(x => x && typeof x === 'object' && typeof x.body === 'string' && typeof x.author === 'string' && predicate(x)) : [];

function load() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(storageKey)); } catch { return structuredClone(defaults); }
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    bookmarks: strings(s.bookmarks).filter(id => comics.some(c => c.id === id)),
    queue: strings(s.queue, 30).filter(id => comics.some(c => c.id === id)),
    history: strings(s.history).filter(id => comics.some(c => c.chapters.some(ch => ch.id === id))),
    notices: strings(s.notices, 30),
    posts: records(s.posts, x => idPattern.test(x.id) && typeof x.title === 'string' && Number.isInteger(x.category) && x.category > 0 && x.category < 7),
    replies: records(s.replies, x => idPattern.test(x.topic)),
    chat: records(s.chat, x => idPattern.test(x.id) && idPattern.test(x.room)),
    name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 36) : defaults.name,
    prefs: {
      wide: s.prefs?.wide === true,
      alerts: s.prefs?.alerts !== false,
      taste: types.includes(s.prefs?.taste) ? s.prefs.taste : '',
      mode: ['Gulir', 'Halaman', 'Dua halaman'].includes(s.prefs?.mode) ? s.prefs.mode : 'Gulir',
      autonext: s.prefs?.autonext === true,
      genres: strings(s.prefs?.genres, 20).filter(g => allGenres.includes(g)),
    },
  };
}
const state = load();
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); return true; }
  catch { announce('Penyimpanan browser tidak tersedia. Perubahan hanya berlaku pada halaman ini.'); return false; }
}
function notice(text) { if (state.prefs.alerts) state.notices = [text, ...state.notices].slice(0, 30); }
function announce(message) { const status = document.querySelector('#status'); if (status) status.textContent = message; }
function navLink([label, href]) {
  const selected = appUrl === href || appUrl.startsWith(`${href}/`) || (href === '/series' && appUrl.startsWith('/chapter/'));
  return `<a href="${href}"${selected ? ' aria-current="page"' : ''}>${label}</a>`;
}
function header() {
  const userInitials = (state.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || 'HL').toUpperCase();
  const hasNotices = state.prefs.alerts && state.notices.length > 0;
  return `<header class="site-header"><div class="masthead">${mark}<nav class="site-nav" aria-label="Navigasi utama">${nav.map(navLink).join('')}</nav><div class="tools"><button class="icon" data-dialog="search" aria-label="Cari">${searchIcon}</button><a class="icon chat-link" href="/community/chat" aria-label="Ruang obrolan">${chatIcon}<span class="dot" aria-hidden="true"></span></a><a class="icon" href="/notifikasi" aria-label="Notifikasi">${bellIcon}${hasNotices ? '<span class="dot" aria-hidden="true"></span>' : ''}</a><details class="user-menu"><summary class="avatar-pill" aria-label="Menu pengguna">${userInitials}</summary><nav class="surface" aria-label="Menu pengguna"><a href="/user/me">Profil</a><a href="/notifikasi">Notifikasi${hasNotices ? ` (${state.notices.length})` : ''}</a><a href="/settings">Pengaturan</a><a href="/sistem-aura">Aura &amp; Badge</a><a href="/panduan">Panduan</a><a href="/onboarding">Mulai demo</a></nav></details></div></div></header>`;
}
function footer() {
  return `<footer class="site-footer"><div class="foot-grid"><div>${mark}<p>Baca manga, manhwa, dan manhua terbaru. Simpan bacaan di Pustaka dan ngobrol bareng di Komunitas.</p></div><nav aria-label="Jelajahi"><strong>Jelajahi</strong><a href="/series">Komik</a><a href="/library">Pustaka</a><a href="/community">Komunitas</a><a href="/leaderboard">Leaderboard</a></nav><nav aria-label="Akun"><strong>Akun</strong><a href="/premium">Premium</a><a href="/user/me">Profil</a><a href="/settings">Pengaturan</a></nav><nav aria-label="Bantuan"><strong>Bantuan</strong><a href="/sistem-aura">Aura &amp; Badge</a><a href="/panduan">Panduan</a></nav></div><div class="foot-end"><span>© 2026 Shinigami Lab · replika lokal independen</span><a href="#top">Kembali ke atas</a></div></footer>`;
}
function modal() {
  return `<dialog id="search" aria-labelledby="search-title"><div class="dialog-heading"><h2 id="search-title">Cari komik</h2><form method="dialog"><button aria-label="Tutup pencarian">×</button></form></div><form action="/series"><label class="sr-only" for="quick-search">Judul komik</label><input type="search" name="q" id="quick-search" maxlength="100" placeholder="Masukkan judul…" autofocus></form><div id="search-results" class="stack" aria-live="polite"></div></dialog>
  <dialog id="demo" aria-labelledby="demo-title"><div class="dialog-heading"><h2 id="demo-title">Pembelian tidak tersedia</h2><form method="dialog"><button aria-label="Tutup informasi">×</button></form></div><p>Ini adalah demo lokal. Tidak ada pembayaran atau penagihan, dan kamu tidak perlu memasukkan data akun.</p></dialog>`;
}

function resolve() {
  let parts;
  try { parts = appUrl === '/' ? [] : appUrl.slice(1).split('/').map(decodeURIComponent); } catch { return pages.notFound; }
  const [first, second, third, fourth] = parts;
  const n = parts.length;
  if (n === 0) return pages.home;
  if (n === 1) {
    const routes = { series: pages.catalog, library: pages.library, community: pages.community, leaderboard: pages.leaderboard, premium: pages.premium, 'sistem-aura': pages.aura, panduan: pages.guide, notifikasi: pages.notifications, settings: pages.preferences, onboarding: pages.onboarding, claim: pages.claim };
    return Object.hasOwn(routes, first) ? routes[first] : pages.notFound;
  }
  if (first === 'series' && n === 2) {
    const comic = comics.find(c => c.id === second);
    if (comic) return () => pages.series(state, query, comic);
  }
  if (first === 'chapter' && n === 2) {
    const comic = comics.find(c => c.chapters.some(ch => ch.id === second));
    if (comic) {
      const chapter = comic.chapters.find(ch => ch.id === second);
      const visited = state.history.includes(second);
      state.history = [second, ...state.history.filter(id => id !== second)];
      if (!visited) notice(`Chapter ${chapter.number} — ${comic.title} ditambahkan ke riwayat.`);
      save();
      return () => pages.reader(state, query, comic, chapter);
    }
  }
  if (first === 'community' && second === 'chat' && n <= 4) return () => pages.chat(state, query, third, fourth);
  if (first === 'community' && n === 2) return () => pages.topic(state, query, second);
  if (first === 'chat' && n === 2) return () => pages.chat(state, query, second);
  if (first === 'user' && n === 2 && idPattern.test(second)) return () => pages.profile(state, query, second);
  if (first === 'panduan' && n === 2) return () => pages.guide(state, query, second);
  if (first === 'onboarding' && n === 2) return () => pages.onboarding(state, query, second);
  if (first === 'settings' && second === 'akun' && third === 'klaim' && n === 3) return pages.claim;
  if (first === 'settings' && second === 'upgrade' && n === 2) return pages.premium;
  if (first === 'settings' && n === 2) return () => pages.preferences(state, query, second);
  return pages.notFound;
}
const content = resolve();
const reader = appUrl.startsWith('/chapter/');
root.innerHTML = `<div id="top"></div>${header()}<main id="main" class="${appUrl === '/' ? 'home' : 'page'}" tabindex="-1">${content(state, query)}</main>${reader ? '' : footer()}${modal()}<div id="status" role="status" class="sr-only"></div>`;
const h1 = document.querySelector('main h1');
if (h1 && appUrl !== '/') document.title = `${h1.textContent} · Shinigami`;

function searchResults() {
  const input = document.querySelector('#quick-search');
  const keyword = input.value.trim().toLowerCase();
  const results = comics.filter(comic => comic.title.toLowerCase().includes(keyword)).slice(0, 6);
  document.querySelector('#search-results').innerHTML = results.length ? results.map(x => `<a class="row" href="${seriesUrl(x)}"><strong>${x.title}</strong><span>${x.type}</span><span>›</span></a>`).join('') : '<p>Tidak ada komik yang cocok.</p>';
}
function moveHero(step) {
  const track = document.querySelector('.hero-track');
  if (step > 0) track.append(track.firstElementChild);
  else track.prepend(track.lastElementChild);
  track.querySelector('.featured').classList.remove('featured');
  track.children[3].classList.add('featured');
}
root.addEventListener('click', event => {
  const button = event.target.closest('button');
  const menu = document.querySelector('.user-menu');
  if (menu.open && !menu.contains(event.target)) menu.open = false;
  if (!button) return;
  if (button.hasAttribute('data-toggle-composer')) {
    const composer = document.querySelector('#post-composer');
    if (composer) { composer.open = !composer.open; composer.querySelector('input')?.focus(); }
    return;
  }
  const { rail, slide, dialog, toggle, clear, id } = button.dataset;
  if (rail) document.querySelector('.rank-track').scrollBy({ left: Number(rail) * 372, behavior: 'auto' });
  if (slide) moveHero(Number(slide));
  if (dialog) {
    if (dialog === 'search') searchResults();
    document.getElementById(dialog).showModal();
  }
  if (toggle) {
    const selected = state[toggle].includes(id);
    if (toggle === 'queue' && !selected && state.queue.length >= 30) { announce('Antrean sudah penuh.'); return; }
    state[toggle] = selected ? state[toggle].filter(item => item !== id) : [id, ...state[toggle]];
    button.setAttribute('aria-pressed', String(!selected));
    button.textContent = toggle === 'bookmarks' ? (selected ? 'Bookmark' : 'Tersimpan') : (selected ? 'Tambah ke antrean' : 'Dalam antrean');
    if (save()) announce(button.textContent);
  }
  if (clear && confirm(clear === 'history' ? 'Hapus semua riwayat baca lokal?' : 'Hapus semua notifikasi lokal?')) {
    state[clear] = [];
    if (save()) location.reload();
  }
});
document.querySelector('#quick-search').addEventListener('input', searchResults);
root.addEventListener('change', event => {
  if (event.target.matches('[data-auto-submit]')) event.target.form?.submit();
});
root.addEventListener('submit', event => {
  const form = event.target;
  const { form: kind, id } = form.dataset;
  if (!kind) return;
  event.preventDefault();
  const formData = new FormData(form);
  const body = String(formData.get('body') ?? '').trim();
  const author = state.name;
  let destination = appUrl;
  if (kind === 'post' || kind === 'reply' || kind === 'chat') {
    if (!body) { announce('Tulis isi sebelum mengirim.'); return; }
    if (kind === 'post') {
      const postTitle = String(formData.get('title')).trim();
      if (!postTitle) { announce('Masukkan judul diskusi.'); return; }
      const postId = crypto.randomUUID();
      state.posts.unshift({ id: postId, title: postTitle, category: Number(formData.get('category')), author, body });
      notice(`Post baru: ${postTitle}`);
      destination = `/community/${postId}`;
    } else if (kind === 'reply') {
      state.replies.push({ topic: id, author, body });
    } else {
      const message = crypto.randomUUID();
      state.chat.push({ room: id, id: message, author, body });
      destination = `/community/chat/${id}/${message}`;
    }
  } else {
    if (id === 'akun') {
      const name = String(formData.get('name')).trim();
      if (!name) { announce('Nama tampilan tidak boleh kosong.'); return; }
      state.name = name;
    }
    if (id === 'baca') {
      state.prefs.wide = formData.has('wide');
      state.prefs.autonext = formData.has('autonext');
      state.prefs.mode = String(formData.get('mode') ?? 'Gulir');
    }
    if (id === 'notifikasi') state.prefs.alerts = formData.has('alerts');
    if (id === 'selera') {
      state.prefs.taste = String(formData.get('taste') ?? '');
      state.prefs.genres = formData.getAll('genres').map(String);
    }
    destination = kind === 'onboarding' ? (id === 'akun' ? '/onboarding/selera' : '/user/me') : '';
  }
  if (!save()) return;
  if (destination) location.assign(destination);
  else announce('Perubahan tersimpan.');
});
