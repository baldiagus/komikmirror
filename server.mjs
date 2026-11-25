import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const assets = new Map([
  ['/styles.css', 'text/css'], ['/app.js', 'text/javascript'],
  ['/catalog.js', 'text/javascript'], ['/pages.js', 'text/javascript'],
  ['/data/catalog.json', 'application/json'],
]);
const html = await readFile(new URL('./index.html', import.meta.url));
const files = new Map(await Promise.all([...assets].map(async ([name, type]) => [
  name, { type, body: await readFile(new URL(`.${name}`, import.meta.url)).catch(() => Buffer.from('[]')) },
])));

createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const pathname = req.url.split('?', 1)[0];
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
