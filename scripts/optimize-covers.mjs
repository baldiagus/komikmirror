import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const catalogPath = 'data/catalog.json';
const originalCover = /^\/media\/covers\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\.(?:jpeg|jpg|png|webp)$/;

export async function encodeCover(source, destination) {
  const temp = `${destination}.${randomUUID()}.tmp`;
  try {
    await run('ffmpeg', [
      '-nostdin', '-loglevel', 'error', '-xerror', '-threads', '1', '-filter_threads', '1',
      '-i', source, '-vf', "scale=w='min(iw,360)':h=-1:flags=lanczos",
      '-frames:v', '1', '-c:v', 'libwebp', '-quality', '75', '-f', 'webp', temp,
    ], { timeout: 30_000, windowsHide: true });
    if (!(await stat(temp)).size) throw new Error('FFmpeg produced an empty cover');
    await rename(temp, destination);
  } finally {
    await rm(temp, { force: true });
  }
}

if (import.meta.main) {
  const catalog = await readFile(catalogPath, 'utf8');
  const items = JSON.parse(catalog);
  const sources = [...new Set(items.map(item => item.coverUrl).filter(url => originalCover.test(url)))];
  const replacements = new Map();
  let failed = 0;
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < sources.length) {
      const url = sources[cursor++];
      const destination = `/media/covers/${originalCover.exec(url)[1]}-360.webp`;
      try {
        await encodeCover(`data${url}`, `data${destination}`);
        replacements.set(url, destination);
      } catch (error) {
        if (error.code === 'ENOENT') throw error;
        failed++;
        console.warn(`Kept ${url}: ${error.stderr?.trim().split('\n').at(-1) || error.message}`);
      }
    }
  }));

  if (replacements.size) {
    for (const item of items) item.coverUrl = replacements.get(item.coverUrl) ?? item.coverUrl;
    const temp = `${catalogPath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, JSON.stringify(items, null, 2), { flag: 'wx' });
      if (await readFile(catalogPath, 'utf8') !== catalog) throw new Error('Catalog changed during optimization; originals were kept');
      await rename(temp, catalogPath);
    } finally {
      await rm(temp, { force: true });
    }
    // Remove originals only once the catalog points at the complete WebP files.
    for (const url of replacements.keys()) await rm(`data${url}`, { force: true });
  }
  console.log({ optimized: replacements.size, originalsKept: failed });
  if (failed) process.exitCode = 1;
}
