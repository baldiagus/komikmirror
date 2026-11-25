import { createServer } from 'node:http';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

const assets = new Map([
  ['/styles.css', 'text/css'], ['/app.js', 'text/javascript'],
  ['/catalog.js', 'text/javascript'], ['/pages.js', 'text/javascript'],
]);
const html = await readFile(new URL('./index.html', import.meta.url));
const files = new Map(await Promise.all([...assets].map(async ([name, type]) => [
  name, { type, body: await readFile(new URL(`.${name}`, import.meta.url)) },
])));
const mime = new Map([['.webp', 'image/webp'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png']]);

async function chapterPages(id) {
  const dir = `data/media/chapters/${id}`;
  const existing = await readdir(dir).catch(() => []);
  const images = existing.filter(f => /\.(webp|jpe?g|png)$/i.test(f)).sort();
  if (images.length) return images.map(f => `/media/chapters/${id}/${f}`);

  const res = await fetch(`https://api.shinigami.io/v1/chapter/detail/${id}`, {
    headers: { Accept: 'application/json', Origin: 'https://s1.shinigami.mx', Referer: 'https://s1.shinigami.mx/' },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const d = json?.data;
  const base = d?.base_url?.replace(/\/?$/, '/');
  const prefix = d?.chapter?.path?.replace(/^\/+/, '') ?? '';
  if (!base || !Array.isArray(d?.chapter?.data) || !d.chapter.data.length) return [];

  await mkdir(dir, { recursive: true });
  const pages = await Promise.all(d.chapter.data.map(async (name, idx) => {
    const ext = extname(name) || '.webp';
    const fileName = `${String(idx + 1).padStart(3, '0')}${ext}`;
    const remoteUrl = new URL(prefix + name, base).href;
    const imgRes = await fetch(remoteUrl, { headers: { Referer: 'https://s1.shinigami.mx/' } }).catch(() => null);
    if (imgRes?.ok) {
      await writeFile(`${dir}/${fileName}`, Buffer.from(await imgRes.arrayBuffer()));
      return `/media/chapters/${id}/${fileName}`;
    }
    return remoteUrl;
  }));
  return pages;
}

createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const pathname = req.url.split('?', 1)[0];
  if (pathname === '/data/catalog.json') {
    const body = await readFile('data/catalog.json').catch(() => Buffer.from('[]'));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' })
      .end(req.method === 'HEAD' ? undefined : body);
    return;
  }
  const mediaMatch = pathname.match(/^\/media\/(covers\/[0-9a-f-]{36}\.(?:webp|jpe?g|png)|chapters\/[0-9a-f-]{36}\/\d{3}\.(?:webp|jpe?g|png))$/);
  if (mediaMatch) {
    const body = await readFile(`data/media/${mediaMatch[1]}`).catch(() => null);
    if (!body) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime.get(extname(mediaMatch[1])) ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=86400' })
      .end(req.method === 'HEAD' ? undefined : body);
    return;
  }
  const chMatch = pathname.match(/^\/api\/chapter\/([0-9a-f-]{36})$/);
  if (chMatch) {
    const pages = await chapterPages(chMatch[1]).catch(() => null);
    if (!pages) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' })
      .end(req.method === 'HEAD' ? undefined : JSON.stringify({ pages }));
    return;
  }
  const asset = files.get(pathname);
  if (!asset && /\.[^/]+$/.test(pathname)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'Content-Type': `${asset?.type ?? 'text/html'}; charset=utf-8`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  }).end(req.method === 'HEAD' ? undefined : asset?.body ?? html);
}).listen(Number(process.env.PORT ?? 4173), '127.0.0.1', function () {
  console.log(`Shinigami Lab: http://127.0.0.1:${this.address().port}`);
});
