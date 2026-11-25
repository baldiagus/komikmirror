import "dotenv/config";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { and, eq } from "drizzle-orm";
import { closeDb, db } from "../src/db";
import { chapterPanels, chapters, mediaAssets, series } from "../src/db/schema";
import { getMediaRoot, getSnapshotDir } from "../src/lib/env";
import { slugify } from "../src/lib/slug";
import { snapshotSeriesSchema } from "../src/lib/validation";

const execFileAsync = promisify(execFile);
const SOURCE = "shinigami-snapshot";
const LOCAL_COVER_RE =
  /^\/media\/covers\/([0-9a-f-]{36}(?:-360\.webp|\.(?:webp|jpe?g|png)))$/i;

interface CliOptions {
  dryRun: boolean;
  snapshotDir: string;
  batchSize: number;
  limit: number | null;
}

interface ImportReport {
  dryRun: boolean;
  snapshotPath: string;
  totalSnapshotSeries: number;
  totalSnapshotChapters: number;
  seriesCreated: number;
  seriesUpdated: number;
  seriesSkippedAdmin: number;
  seriesSkippedArchived: number;
  chaptersCreated: number;
  chaptersUpdated: number;
  chaptersSkippedAdmin: number;
  chaptersSkippedArchived: number;
  syntheticChaptersDetected: number;
  syntheticChaptersNotPublished: number;
  fractionalChaptersCount: number;
  fractionalChaptersSample: {
    seriesPublicId: string;
    chapterPublicId: string;
    number: string;
  }[];
  coversImported: number;
  coversReused: number;
  coversConvertedWithFfmpeg: number;
  nonLocalCovers: { seriesId: string; title: string; coverUrl: string }[];
  missingCoverFiles: { seriesId: string; coverUrl: string }[];
  panelsImported: number;
  panelsReused: number;
  chaptersWithPanels: number;
  chaptersWithoutPanels: number;
  validationErrors: { index: number; id?: string; reason: string }[];
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let dryRun = false;
  let snapshotDir = getSnapshotDir();
  let batchSize = 50;
  let limit: number | null = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--snapshot" && args[i + 1]) snapshotDir = path.resolve(args[++i]);
    else if (a === "--batch-size" && args[i + 1]) batchSize = Math.max(1, Number(args[++i]) || 50);
    else if (a === "--limit" && args[i + 1]) limit = Math.max(1, Number(args[++i]) || 0) || null;
  }
  return { dryRun, snapshotDir, batchSize, limit };
}

function parsePngDims(buf: Buffer) {
  if (buf.length < 24 || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null;
  return { mimeType: "image/png" as const, ext: "png" as const, width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function parseWebpDims(buf: Buffer) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      mimeType: "image/webp" as const,
      ext: "webp" as const,
      width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
      height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
    };
  }
  if (chunk === "VP8L" && buf[20] === 0x2f) {
    const bits = buf.readUInt32LE(21);
    return {
      mimeType: "image/webp" as const,
      ext: "webp" as const,
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (chunk === "VP8 " && buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) {
    return {
      mimeType: "image/webp" as const,
      ext: "webp" as const,
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  return null;
}

function parseJpegDims(buf: Buffer) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    while (offset < buf.length && buf[offset] === 0xff) offset++;
    if (offset >= buf.length) return null;
    const marker = buf[offset++];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buf.length) return null;
    const len = buf.readUInt16BE(offset);
    if (len < 2 || offset + len > buf.length) return null;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && offset + 7 <= buf.length) {
      return {
        mimeType: "image/jpeg" as const,
        ext: "jpg" as const,
        height: buf.readUInt16BE(offset + 3),
        width: buf.readUInt16BE(offset + 5),
      };
    }
    offset += len;
  }
  return null;
}

function inspectImage(buf: Buffer) {
  const parsed = parsePngDims(buf) ?? parseWebpDims(buf) ?? parseJpegDims(buf);
  if (!parsed || parsed.width < 1 || parsed.height < 1) return null;
  return {
    ...parsed,
    byteSize: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
  };
}

let ffmpegChecked: boolean | null = null;
async function hasFfmpeg(): Promise<boolean> {
  if (ffmpegChecked !== null) return ffmpegChecked;
  try {
    await execFileAsync("ffmpeg", ["-version"], { timeout: 5_000, windowsHide: true });
    ffmpegChecked = true;
  } catch {
    ffmpegChecked = false;
  }
  return ffmpegChecked;
}

async function maybeEncodeCoverToWebp(sourcePath: string, stagingDir: string): Promise<{ buffer: Buffer; converted: boolean }> {
  if (sourcePath.endsWith("-360.webp") || !(await hasFfmpeg())) {
    return { buffer: await readFile(sourcePath), converted: false };
  }
  await mkdir(stagingDir, { recursive: true });
  const tempOut = path.join(stagingDir, `ffmpeg-${randomUUID()}.webp`);
  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-nostdin",
        "-loglevel",
        "error",
        "-xerror",
        "-threads",
        "1",
        "-filter_threads",
        "1",
        "-i",
        sourcePath,
        "-vf",
        "scale=w='min(iw,360)':h=-1:flags=lanczos",
        "-frames:v",
        "1",
        "-c:v",
        "libwebp",
        "-quality",
        "75",
        "-f",
        "webp",
        tempOut,
      ],
      { timeout: 30_000, windowsHide: true },
    );
    const outBuf = await readFile(tempOut);
    if (outBuf.length > 0) {
      return { buffer: outBuf, converted: true };
    }
    return { buffer: await readFile(sourcePath), converted: false };
  } catch {
    return { buffer: await readFile(sourcePath), converted: false };
  } finally {
    await rm(tempOut, { force: true }).catch(() => {});
  }
}

async function writeStagedFile(mediaRoot: string, storageKey: string, buf: Buffer): Promise<void> {
  const stagingDir = path.join(mediaRoot, ".staging");
  const finalPath = path.resolve(mediaRoot, storageKey);
  if (!finalPath.startsWith(mediaRoot + path.sep)) {
    throw new Error(`Unsafe storageKey: ${storageKey}`);
  }
  await mkdir(stagingDir, { recursive: true });
  await mkdir(path.dirname(finalPath), { recursive: true });
  const tempPath = path.join(stagingDir, `${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, buf, { flag: "wx" });
    await rename(tempPath, finalPath);
  } catch (err) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw err;
  }
}

async function ensureCoverMedia(
  sourceFile: string,
  mediaRoot: string,
  dryRun: boolean,
  report: ImportReport,
): Promise<string | null> {
  let exists = false;
  try {
    exists = (await stat(sourceFile)).isFile();
  } catch {
    exists = false;
  }
  if (!exists) return null;

  if (dryRun) {
    const buf = await readFile(sourceFile);
    const info = inspectImage(buf);
    if (!info) return null;
    report.coversImported++;
    return "dry-run-cover";
  }

  const stagingDir = path.join(mediaRoot, ".staging");
  const { buffer, converted } = await maybeEncodeCoverToWebp(sourceFile, stagingDir);
  const info = inspectImage(buffer);
  if (!info) return null;
  if (converted) report.coversConvertedWithFfmpeg++;

  // Reuse existing cover asset with identical sha256 if file is still on disk
  const [existing] = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.kind, "cover"), eq(mediaAssets.sha256, info.sha256)))
    .limit(1);

  if (existing) {
    const existingPath = path.resolve(mediaRoot, existing.storageKey);
    const stillThere = await stat(existingPath).then((s) => s.isFile()).catch(() => false);
    if (stillThere) {
      report.coversReused++;
      return existing.id;
    }
  }

  const id = randomUUID();
  const storageKey = `covers/${id}.${info.ext}`;
  await writeStagedFile(mediaRoot, storageKey, buffer);

  try {
    await db.insert(mediaAssets).values({
      id,
      kind: "cover",
      storageKey,
      mimeType: info.mimeType,
      byteSize: info.byteSize,
      width: info.width,
      height: info.height,
      sha256: info.sha256,
    });
    report.coversImported++;
    return id;
  } catch (err) {
    await rm(path.resolve(mediaRoot, storageKey), { force: true }).catch(() => {});
    throw err;
  }
}

async function importChapterPanels(
  chapterDbId: string,
  chapterPublicId: string,
  snapshotDir: string,
  mediaRoot: string,
  dryRun: boolean,
  report: ImportReport,
): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(chapterPublicId)) return false;
  const dir = path.join(snapshotDir, "media", "chapters", chapterPublicId);
  const entries = await readdir(dir).catch(() => []);
  const imageFiles = entries.filter((f) => /\.(webp|jpe?g|png)$/i.test(f)).sort();
  if (imageFiles.length === 0) return false;

  if (dryRun) {
    for (const file of imageFiles) {
      const buf = await readFile(path.join(dir, file));
      if (inspectImage(buf)) report.panelsImported++;
    }
    return true;
  }

  const existingPanels = await db
    .select({ id: chapterPanels.id, position: chapterPanels.position })
    .from(chapterPanels)
    .where(eq(chapterPanels.chapterId, chapterDbId));

  if (existingPanels.length >= imageFiles.length) {
    report.panelsReused += existingPanels.length;
    return true;
  }

  const existingPositions = new Set(existingPanels.map((p) => p.position));

  for (let i = 0; i < imageFiles.length; i++) {
    const position = i + 1;
    if (existingPositions.has(position)) {
      report.panelsReused++;
      continue;
    }
    const buf = await readFile(path.join(dir, imageFiles[i]));
    const info = inspectImage(buf);
    if (!info) continue;

    const mediaId = randomUUID();
    const storageKey = `panels/${chapterDbId}/${mediaId}.${info.ext}`;
    await writeStagedFile(mediaRoot, storageKey, buf);

    try {
      await db.transaction(async (tx) => {
        await tx.insert(mediaAssets).values({
          id: mediaId,
          kind: "panel",
          storageKey,
          mimeType: info.mimeType,
          byteSize: info.byteSize,
          width: info.width,
          height: info.height,
          sha256: info.sha256,
        });
        await tx.insert(chapterPanels).values({
          id: randomUUID(),
          chapterId: chapterDbId,
          mediaId,
          position,
        });
      });
      report.panelsImported++;
    } catch (err) {
      await rm(path.resolve(mediaRoot, storageKey), { force: true }).catch(() => {});
      throw err;
    }
  }

  return true;
}

async function resolveUniqueSlug(title: string, externalId: string): Promise<string> {
  const base = slugify(title) || `series-${externalId.slice(0, 8)}`;
  const [conflict] = await db
    .select({ id: series.id, externalId: series.externalId })
    .from(series)
    .where(eq(series.slug, base))
    .limit(1);
  if (!conflict || conflict.externalId === externalId) {
    return base;
  }
  return `${base.slice(0, 140)}-${externalId.slice(0, 8)}`;
}

async function main() {
  const opts = parseArgs();
  const catalogPath = path.join(opts.snapshotDir, "catalog.json");
  const mediaRoot = getMediaRoot();

  const rawText = await readFile(catalogPath, "utf8");
  const parsedJson: unknown = JSON.parse(rawText);
  if (!Array.isArray(parsedJson)) {
    throw new Error("catalog.json root must be an array.");
  }

  const allItems = opts.limit ? parsedJson.slice(0, opts.limit) : parsedJson;

  const report: ImportReport = {
    dryRun: opts.dryRun,
    snapshotPath: catalogPath,
    totalSnapshotSeries: allItems.length,
    totalSnapshotChapters: 0,
    seriesCreated: 0,
    seriesUpdated: 0,
    seriesSkippedAdmin: 0,
    seriesSkippedArchived: 0,
    chaptersCreated: 0,
    chaptersUpdated: 0,
    chaptersSkippedAdmin: 0,
    chaptersSkippedArchived: 0,
    syntheticChaptersDetected: 0,
    syntheticChaptersNotPublished: 0,
    fractionalChaptersCount: 0,
    fractionalChaptersSample: [],
    coversImported: 0,
    coversReused: 0,
    coversConvertedWithFfmpeg: 0,
    nonLocalCovers: [],
    missingCoverFiles: [],
    panelsImported: 0,
    panelsReused: 0,
    chaptersWithPanels: 0,
    chaptersWithoutPanels: 0,
    validationErrors: [],
  };

  try {
    for (let start = 0; start < allItems.length; start += opts.batchSize) {
      const batch = allItems.slice(start, start + opts.batchSize);

      for (let offset = 0; offset < batch.length; offset++) {
        const index = start + offset;
        const raw = batch[offset];
        const validated = snapshotSeriesSchema.safeParse(raw);
        if (!validated.success) {
          report.validationErrors.push({
            index,
            id: typeof raw === "object" && raw && "id" in raw ? String((raw as { id?: unknown }).id) : undefined,
            reason: validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
          });
          continue;
        }

        const item = validated.data;
        report.totalSnapshotChapters += item.chapters.length;

        // Classify cover safely — NEVER server-fetch remote URLs
        let coverMediaId: string | null = null;
        let externalCoverUrl: string | null = null;
        if (item.coverUrl) {
          const localMatch = LOCAL_COVER_RE.exec(item.coverUrl);
          if (localMatch) {
            const localPath = path.join(opts.snapshotDir, "media", "covers", localMatch[1]);
            const cid = await ensureCoverMedia(localPath, mediaRoot, opts.dryRun, report);
            if (cid) {
              coverMediaId = cid === "dry-run-cover" ? null : cid;
            } else {
              report.missingCoverFiles.push({ seriesId: item.id, coverUrl: item.coverUrl });
            }
          } else {
            externalCoverUrl = item.coverUrl;
            report.nonLocalCovers.push({
              seriesId: item.id,
              title: item.title,
              coverUrl: item.coverUrl,
            });
          }
        }

        let seriesDbId: string;

        if (opts.dryRun) {
          const [existing] = await db
            .select({
              id: series.id,
              status: series.status,
              adminEditedAt: series.adminEditedAt,
            })
            .from(series)
            .where(and(eq(series.source, SOURCE), eq(series.externalId, item.id)))
            .limit(1);

          if (existing?.status === "archived") {
            report.seriesSkippedArchived++;
          } else if (existing?.adminEditedAt) {
            report.seriesSkippedAdmin++;
          } else if (existing) {
            report.seriesUpdated++;
          } else {
            report.seriesCreated++;
          }
          seriesDbId = existing?.id ?? "dry-run-series";
        } else {
          const [existing] = await db
            .select()
            .from(series)
            .where(and(eq(series.source, SOURCE), eq(series.externalId, item.id)))
            .limit(1);

          if (existing) {
            seriesDbId = existing.id;
            if (existing.status === "archived") {
              report.seriesSkippedArchived++;
            } else if (existing.adminEditedAt) {
              report.seriesSkippedAdmin++;
            } else {
              await db
                .update(series)
                .set({
                  title: item.title,
                  type: item.type,
                  genre: item.genre,
                  publicationStatus: item.status,
                  rank: item.rank,
                  followers: item.followers,
                  rating: item.rating,
                  summary: item.summary,
                  updatedLabel: item.updated || null,
                  latestChapterNumber: item.latestChapterNumber,
                  coverMediaId: coverMediaId ?? existing.coverMediaId,
                  externalCoverUrl: externalCoverUrl ?? existing.externalCoverUrl,
                })
                .where(eq(series.id, existing.id));
              report.seriesUpdated++;
            }
          } else {
            seriesDbId = randomUUID();
            const slug = await resolveUniqueSlug(item.title, item.id);
            await db.insert(series).values({
              id: seriesDbId,
              publicId: item.id,
              slug,
              source: SOURCE,
              externalId: item.id,
              title: item.title,
              type: item.type,
              genre: item.genre,
              publicationStatus: item.status,
              status: "published",
              rank: item.rank,
              followers: item.followers,
              rating: item.rating,
              summary: item.summary,
              updatedLabel: item.updated || null,
              latestChapterNumber: item.latestChapterNumber,
              coverMediaId,
              externalCoverUrl,
            });
            report.seriesCreated++;
          }
        }

        // Chapters for this series
        for (let chIdx = 0; chIdx < item.chapters.length; chIdx++) {
          const ch = item.chapters[chIdx];
          const isSynthetic = ch.id === `${item.id}-1`;
          const numericVal = Number(ch.number);
          const isFractional = !Number.isInteger(numericVal);

          if (isSynthetic) {
            report.syntheticChaptersDetected++;
            report.syntheticChaptersNotPublished++;
          }
          if (isFractional) {
            report.fractionalChaptersCount++;
            if (report.fractionalChaptersSample.length < 20) {
              report.fractionalChaptersSample.push({
                seriesPublicId: item.id,
                chapterPublicId: ch.id,
                number: String(numericVal),
              });
            }
          }

          const desiredStatus = isSynthetic ? "draft" : "published";

          if (opts.dryRun) {
            const [existingCh] = await db
              .select({
                id: chapters.id,
                status: chapters.status,
                adminEditedAt: chapters.adminEditedAt,
              })
              .from(chapters)
              .where(and(eq(chapters.source, SOURCE), eq(chapters.externalId, ch.id)))
              .limit(1);

            if (existingCh?.status === "archived") report.chaptersSkippedArchived++;
            else if (existingCh?.adminEditedAt) report.chaptersSkippedAdmin++;
            else if (existingCh) report.chaptersUpdated++;
            else report.chaptersCreated++;

            if (!isSynthetic) {
              const hasPanels = await importChapterPanels(
                "dry-run-chapter",
                ch.id,
                opts.snapshotDir,
                mediaRoot,
                true,
                report,
              );
              if (hasPanels) report.chaptersWithPanels++;
              else report.chaptersWithoutPanels++;
            }
            continue;
          }

          const [existingCh] = await db
            .select()
            .from(chapters)
            .where(and(eq(chapters.source, SOURCE), eq(chapters.externalId, ch.id)))
            .limit(1);

          let chapterDbId: string;
          if (existingCh) {
            chapterDbId = existingCh.id;
            if (existingCh.status === "archived") {
              report.chaptersSkippedArchived++;
            } else if (existingCh.adminEditedAt) {
              report.chaptersSkippedAdmin++;
            } else {
              await db
                .update(chapters)
                .set({
                  chapterNumber: ch.number,
                  sortOrder: chIdx + 1,
                  title: ch.title,
                  isSynthetic,
                  status: isSynthetic ? "draft" : existingCh.status,
                })
                .where(eq(chapters.id, existingCh.id));
              report.chaptersUpdated++;
            }
          } else {
            chapterDbId = randomUUID();
            await db.insert(chapters).values({
              id: chapterDbId,
              seriesId: seriesDbId,
              publicId: ch.id,
              source: SOURCE,
              externalId: ch.id,
              chapterNumber: ch.number,
              sortOrder: chIdx + 1,
              title: ch.title,
              status: desiredStatus,
              isSynthetic,
              publishedAt: desiredStatus === "published" ? new Date() : null,
            });
            report.chaptersCreated++;
          }

          if (!isSynthetic) {
            const hasPanels = await importChapterPanels(
              chapterDbId,
              ch.id,
              opts.snapshotDir,
              mediaRoot,
              false,
              report,
            );
            if (hasPanels) report.chaptersWithPanels++;
            else report.chaptersWithoutPanels++;
          }
        }
      }
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error("Snapshot import failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
