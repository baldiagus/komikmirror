import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getMediaRoot } from "@/lib/env";
import { AppError } from "@/lib/errors";

export type MediaKind = "cover" | "panel";

export interface InspectedImage {
  mimeType: "image/webp" | "image/png" | "image/jpeg";
  ext: "webp" | "png" | "jpg";
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
}

export interface StoredMediaFile extends InspectedImage {
  id: string;
  kind: MediaKind;
  storageKey: string;
}

const LIMITS: Record<
  MediaKind,
  { maxBytes: number; maxWidth: number; maxHeight: number; maxPixels: number }
> = {
  cover: {
    maxBytes: 5 * 1024 * 1024,
    maxWidth: 4096,
    maxHeight: 4096,
    maxPixels: 16_000_000,
  },
  panel: {
    maxBytes: 8 * 1024 * 1024,
    maxWidth: 4096,
    maxHeight: 16384,
    maxPixels: 25_000_000,
  },
};

const STORAGE_KEY_RE =
  /^(covers\/[0-9a-f-]{36}|panels\/[0-9a-f-]{36}\/[0-9a-f-]{36})\.(webp|png|jpg)$/;

function parsePngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  if (
    buf[0] !== 0x89 ||
    buf[1] !== 0x50 ||
    buf[2] !== 0x4e ||
    buf[3] !== 0x47 ||
    buf[4] !== 0x0d ||
    buf[5] !== 0x0a ||
    buf[6] !== 0x1a ||
    buf[7] !== 0x0a
  ) {
    return null;
  }
  // IHDR chunk should follow immediately at byte 12..15
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function parseJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    while (offset < buf.length && buf[offset] === 0xff) offset++;
    if (offset >= buf.length) return null;
    const marker = buf[offset++];
    // Standalone markers without length
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 2 > buf.length) return null;
    const segmentLength = buf.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buf.length) return null;

    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      if (offset + 7 > buf.length) return null;
      const height = buf.readUInt16BE(offset + 3);
      const width = buf.readUInt16BE(offset + 5);
      return { width, height };
    }
    offset += segmentLength;
  }
  return null;
}

function parseWebpDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 30) return null;
  if (
    buf.toString("ascii", 0, 4) !== "RIFF" ||
    buf.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  if (chunk === "VP8L") {
    if (buf[20] !== 0x2f) return null;
    const bits = buf.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  if (chunk === "VP8 ") {
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }
  return null;
}

export function inspectImageBuffer(
  buffer: Buffer,
  kind: MediaKind,
): InspectedImage {
  const limit = LIMITS[kind];
  if (buffer.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Berkas gambar kosong.");
  }
  if (buffer.length > limit.maxBytes) {
    const maxMb = (limit.maxBytes / (1024 * 1024)).toFixed(0);
    throw new AppError(
      "VALIDATION_ERROR",
      `Ukuran gambar melebihi batas maksimal ${maxMb} MB.`,
    );
  }

  let mimeType: InspectedImage["mimeType"] | null = null;
  let ext: InspectedImage["ext"] | null = null;
  let dims: { width: number; height: number } | null = null;

  const png = parsePngDimensions(buffer);
  if (png) {
    mimeType = "image/png";
    ext = "png";
    dims = png;
  } else {
    const webp = parseWebpDimensions(buffer);
    if (webp) {
      mimeType = "image/webp";
      ext = "webp";
      dims = webp;
    } else {
      const jpeg = parseJpegDimensions(buffer);
      if (jpeg) {
        mimeType = "image/jpeg";
        ext = "jpg";
        dims = jpeg;
      }
    }
  }

  if (!mimeType || !ext || !dims) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Format gambar tidak valid. Hanya berkas PNG, JPEG, atau WebP asli yang diizinkan.",
    );
  }

  const { width, height } = dims;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new AppError("VALIDATION_ERROR", "Dimensi gambar tidak valid.");
  }

  if (
    width > limit.maxWidth ||
    height > limit.maxHeight ||
    width * height > limit.maxPixels
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Dimensi gambar (${width}x${height}) melebihi batas aman server.`,
    );
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return {
    mimeType,
    ext,
    width,
    height,
    byteSize: buffer.length,
    sha256,
  };
}

export function resolveMediaAbsolutePath(storageKey: string): string {
  if (!STORAGE_KEY_RE.test(storageKey)) {
    throw new AppError("VALIDATION_ERROR", "Kunci media tidak valid.");
  }
  const root = getMediaRoot();
  const fullPath = path.resolve(root, storageKey);
  if (!fullPath.startsWith(root + path.sep)) {
    throw new AppError("VALIDATION_ERROR", "Jalur media tidak diizinkan.");
  }
  return fullPath;
}

export async function stageAndCommitMediaBuffer(options: {
  buffer: Buffer;
  kind: MediaKind;
  chapterId?: string;
}): Promise<StoredMediaFile> {
  const inspected = inspectImageBuffer(options.buffer, options.kind);
  const id = randomUUID();
  let storageKey: string;
  if (options.kind === "cover") {
    storageKey = `covers/${id}.${inspected.ext}`;
  } else {
    if (!options.chapterId || !/^[0-9a-f-]{36}$/.test(options.chapterId)) {
      throw new AppError("VALIDATION_ERROR", "ID chapter tidak valid untuk panel.");
    }
    storageKey = `panels/${options.chapterId}/${id}.${inspected.ext}`;
  }

  const root = getMediaRoot();
  const stagingDir = path.join(root, ".staging");
  const tempPath = path.join(stagingDir, `${id}.tmp`);
  const finalPath = resolveMediaAbsolutePath(storageKey);

  await mkdir(stagingDir, { recursive: true });
  await mkdir(path.dirname(finalPath), { recursive: true });

  try {
    await writeFile(tempPath, options.buffer, { flag: "wx" });
    const written = await stat(tempPath);
    if (written.size !== options.buffer.length) {
      throw new Error("Staged media file size mismatch");
    }
    await rename(tempPath, finalPath);
  } catch (err) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw err;
  }

  return {
    id,
    kind: options.kind,
    storageKey,
    ...inspected,
  };
}

export async function mediaFileExists(storageKey: string): Promise<boolean> {
  try {
    const fullPath = resolveMediaAbsolutePath(storageKey);
    const info = await stat(fullPath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

export async function removeMediaFile(storageKey: string): Promise<void> {
  try {
    const fullPath = resolveMediaAbsolutePath(storageKey);
    await rm(fullPath, { force: true });
  } catch {
    // Best-effort cleanup
  }
}
