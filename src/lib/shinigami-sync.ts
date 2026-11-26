import { randomUUID } from "node:crypto";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db, getPool } from "@/db";
import { chapters, series } from "@/db/schema";
import { getShinigamiSyncConfig } from "@/lib/env";
import {
  fetchShinigamiChapters,
  fetchShinigamiMangaPage,
  isSafeRemoteImageUrl,
  isShinigamiSource,
  isUuid,
  normalizeDecimalNumber,
  normalizeRating,
  normalizeShinigamiStatus,
  normalizeShinigamiType,
  type UpstreamShinigamiChapter,
  type UpstreamShinigamiManga,
} from "@/lib/shinigami";
import { slugify } from "@/lib/slug";

const SYNC_SOURCE = "shinigami-sync";
const SYNC_LOCK_NAME = "komik_mirror_shinigami_sync";

export interface ShinigamiSyncOptions {
  mode?: "incremental" | "full";
  latestPages?: number;
  requestDelayMs?: number;
  chaptersPerSeries?: number;
  maxSeriesChapterFetch?: number;
}

export interface ShinigamiSyncReport {
  ok: boolean;
  skippedLocked?: boolean;
  mode: "incremental" | "full";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  upstreamMangaFetched: number;
  seriesCreated: number;
  seriesUpdated: number;
  seriesSkippedAdmin: number;
  seriesSkippedArchived: number;
  seriesChaptersChecked: number;
  chaptersCreated: number;
  chaptersUpdated: number;
  chaptersSkippedAdmin: number;
  chaptersSkippedArchived: number;
  errors: string[];
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parseUpstreamDate(raw: string | null | undefined): Date | null {
  if (!raw || !raw.trim()) return null;
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function allocateUniqueSlug(title: string, fallbackId: string): Promise<string> {
  const base = slugify(title).slice(0, 140) || `komik-${fallbackId.slice(0, 8)}`;
  let candidate = base;
  for (let n = 0; n < 30; n++) {
    const [exists] = await db
      .select({ id: series.id })
      .from(series)
      .where(eq(series.slug, candidate))
      .limit(1);
    if (!exists) return candidate;
    candidate = `${base}-${n === 0 ? fallbackId.slice(0, 6) : n + 1}`.slice(0, 160);
  }
  return `${base.slice(0, 120)}-${randomUUID().slice(0, 8)}`;
}

async function upsertChaptersForSeries(
  seriesId: string,
  upstreamChapters: UpstreamShinigamiChapter[],
  counters: {
    chaptersCreated: number;
    chaptersUpdated: number;
    chaptersSkippedAdmin: number;
    chaptersSkippedArchived: number;
  },
): Promise<{ highestNumber: string | null }> {
  if (upstreamChapters.length === 0) return { highestNumber: null };

  // Sort ascending by chapter number so sortOrder reflects natural reading order
  const normalized = upstreamChapters
    .map((ch) => {
      const numStr = normalizeDecimalNumber(ch.chapter_number ?? 0) ?? "0.00";
      const numVal = Number(numStr);
      const displayNum = Number.isInteger(numVal)
        ? String(numVal)
        : String(numVal);
      const title =
        (ch.chapter_title ?? "").trim().slice(0, 255) ||
        `Chapter ${displayNum}`;
      const releaseDate = parseUpstreamDate(ch.release_date ?? ch.created_at);
      return {
        externalId: ch.chapter_id,
        chapterNumber: numStr,
        numVal,
        title,
        releaseDate,
      };
    })
    .sort((a, b) => a.numVal - b.numVal);

  const externalIds = normalized.map((c) => c.externalId);
  const existingRows = await db
    .select({
      id: chapters.id,
      publicId: chapters.publicId,
      externalId: chapters.externalId,
      title: chapters.title,
      chapterNumber: chapters.chapterNumber,
      sortOrder: chapters.sortOrder,
      status: chapters.status,
      adminEditedAt: chapters.adminEditedAt,
      updatedAt: chapters.updatedAt,
    })
    .from(chapters)
    .where(
      and(
        eq(chapters.seriesId, seriesId),
        or(
          inArray(chapters.publicId, externalIds),
          inArray(chapters.externalId, externalIds),
        ),
      ),
    );

  const byKey = new Map<string, (typeof existingRows)[number]>();
  for (const row of existingRows) {
    byKey.set(row.publicId, row);
    if (row.externalId) byKey.set(row.externalId, row);
  }

  let highestNum = -1;
  let highestStr: string | null = null;

  for (const ch of normalized) {
    if (ch.numVal > highestNum) {
      highestNum = ch.numVal;
      highestStr = ch.chapterNumber;
    }

    const existing = byKey.get(ch.externalId);
    const chDate = ch.releaseDate ?? new Date();
    const canonicalSortOrder = Math.max(0, Math.round(ch.numVal * 100));
    if (!existing) {
      try {
        await db.insert(chapters).values({
          id: randomUUID(),
          seriesId,
          publicId: ch.externalId,
          source: SYNC_SOURCE,
          externalId: ch.externalId,
          chapterNumber: ch.chapterNumber,
          sortOrder: canonicalSortOrder,
          title: ch.title,
          status: "published",
          isSynthetic: false,
          publishedAt: chDate,
          updatedAt: chDate,
        });
        counters.chaptersCreated += 1;
      } catch {
        // Ignore rare duplicate race across sources
      }
      continue;
    }

    if (existing.status === "archived") {
      counters.chaptersSkippedArchived += 1;
      continue;
    }
    if (existing.adminEditedAt) {
      counters.chaptersSkippedAdmin += 1;
      continue;
    }

    const timeDiffers =
      ch.releaseDate !== null &&
      Math.abs(ch.releaseDate.getTime() - existing.updatedAt.getTime()) > 60_000;

    if (
      existing.title !== ch.title ||
      Number(existing.chapterNumber) !== ch.numVal ||
      existing.sortOrder !== canonicalSortOrder ||
      timeDiffers
    ) {
      await db
        .update(chapters)
        .set({
          title: ch.title,
          chapterNumber: ch.chapterNumber,
          sortOrder: canonicalSortOrder,
          ...(ch.releaseDate
            ? { publishedAt: ch.releaseDate, updatedAt: ch.releaseDate }
            : { updatedAt: existing.updatedAt }),
        })
        .where(eq(chapters.id, existing.id));
      counters.chaptersUpdated += 1;
    }
  }

  return { highestNumber: highestStr };
}

export async function runShinigamiSync(
  options?: ShinigamiSyncOptions,
): Promise<ShinigamiSyncReport> {
  const cfg = getShinigamiSyncConfig();
  const mode = options?.mode ?? "incremental";
  const latestPages = options?.latestPages ?? cfg.latestPages;
  const requestDelayMs = options?.requestDelayMs ?? cfg.requestDelayMs;
  const chaptersPerSeries = options?.chaptersPerSeries ?? cfg.chaptersPerSeries;
  const maxSeriesChapterFetch =
    options?.maxSeriesChapterFetch ?? cfg.maxSeriesChapterFetch;

  const startedAt = new Date();
  const report: ShinigamiSyncReport = {
    ok: true,
    mode,
    startedAt: startedAt.toISOString(),
    finishedAt: startedAt.toISOString(),
    durationMs: 0,
    upstreamMangaFetched: 0,
    seriesCreated: 0,
    seriesUpdated: 0,
    seriesSkippedAdmin: 0,
    seriesSkippedArchived: 0,
    seriesChaptersChecked: 0,
    chaptersCreated: 0,
    chaptersUpdated: 0,
    chaptersSkippedAdmin: 0,
    chaptersSkippedArchived: 0,
    errors: [],
  };

  // Acquire session-scoped MySQL advisory lock so concurrent syncs never collide
  const lockConn = await getPool().getConnection();
  let lockAcquired = false;
  try {
    const [lockRows] = await lockConn.query(
      "SELECT GET_LOCK(?, 0) AS acquired",
      [SYNC_LOCK_NAME],
    );
    const acquiredVal = Array.isArray(lockRows)
      ? Number((lockRows[0] as { acquired?: number })?.acquired ?? 0)
      : 0;
    if (acquiredVal !== 1) {
      report.skippedLocked = true;
      report.finishedAt = new Date().toISOString();
      report.durationMs = Date.now() - startedAt.getTime();
      return report;
    }
    lockAcquired = true;

    // 1. Collect upstream manga list (incremental = top N pages; full = desc + asc to cover all 1,600+)
    const upstreamMap = new Map<string, UpstreamShinigamiManga>();

    const fetchOrder = async (sortOrder: "desc" | "asc", maxPages: number) => {
      for (let page = 0; page < maxPages; page++) {
        if (page > 0 || upstreamMap.size > 0) await sleep(requestDelayMs);
        const offset = page * 100;
        if (offset >= 1000) break;
        const res = await fetchShinigamiMangaPage(offset, 100, sortOrder);
        if (!res.ok) {
          report.errors.push(
            `manga/list (${sortOrder}, offset=${offset}) HTTP ${res.status}`,
          );
          break;
        }
        for (const item of res.items) {
          if (item?.manga_id && isUuid(item.manga_id)) {
            if (!upstreamMap.has(item.manga_id)) {
              upstreamMap.set(item.manga_id, item);
            }
          }
        }
        if (!res.hasNext || res.items.length < 100) break;
      }
    };

    if (mode === "full") {
      await fetchOrder("desc", 10);
      await fetchOrder("asc", 10);
    } else {
      await fetchOrder("desc", latestPages);
    }

    const upstreamList = Array.from(upstreamMap.values());
    report.upstreamMangaFetched = upstreamList.length;

    if (upstreamList.length === 0) {
      report.ok = report.errors.length === 0;
      report.finishedAt = new Date().toISOString();
      report.durationMs = Date.now() - startedAt.getTime();
      return report;
    }

    // 2. Load existing series matching these external IDs in batches
    const allExternalIds = upstreamList.map((m) => m.manga_id);
    const existingByExternalId = new Map<string, typeof series.$inferSelect>();
    for (let i = 0; i < allExternalIds.length; i += 200) {
      const slice = allExternalIds.slice(i, i + 200);
      const rows = await db
        .select()
        .from(series)
        .where(
          or(
            inArray(series.publicId, slice),
            inArray(series.externalId, slice),
          ),
        );
      for (const r of rows) {
        existingByExternalId.set(r.publicId, r);
        if (r.externalId) existingByExternalId.set(r.externalId, r);
      }
    }

    // Load published non-synthetic chapter counts for existing series
    const existingSeriesIds = Array.from(
      new Set(Array.from(existingByExternalId.values()).map((r) => r.id)),
    );
    const chapterCountMap = new Map<string, number>();
    for (let i = 0; i < existingSeriesIds.length; i += 200) {
      const slice = existingSeriesIds.slice(i, i + 200);
      const counts = await db
        .select({
          seriesId: chapters.seriesId,
          count: sql<number>`count(*)`,
        })
        .from(chapters)
        .where(
          and(
            inArray(chapters.seriesId, slice),
            eq(chapters.status, "published"),
            eq(chapters.isSynthetic, false),
          ),
        )
        .groupBy(chapters.seriesId);
      for (const c of counts) {
        chapterCountMap.set(c.seriesId, Number(c.count ?? 0));
      }
    }

    // 3. Upsert series metadata & queue series that need chapter sync
    const seriesNeedingChapters: {
      seriesId: string;
      mangaId: string;
      updatedAt: Date;
    }[] = [];

    for (const item of upstreamList) {
      const mangaId = item.manga_id;
      const title = (item.title ?? "").trim().slice(0, 255);
      if (!title) continue;

      const type = normalizeShinigamiType(item.country_id);
      const genre =
        (item.taxonomy?.Genre?.[0]?.name ?? "").trim().slice(0, 80) || "Action";
      const publicationStatus = normalizeShinigamiStatus(item.status);
      const rank = Math.max(0, Number(item.rank ?? 0) || 0);
      const followers = Math.max(0, Number(item.bookmark_count ?? 0) || 0);
      const rating = normalizeRating(item.user_rate);
      const summary = (item.description ?? "").trim().slice(0, 5000);
      const rawUpdatedTime = item.latest_chapter_time ?? item.updated_at ?? "";
      const upstreamUpdatedAt = parseUpstreamDate(rawUpdatedTime);
      const updatedLabel = rawUpdatedTime.slice(0, 10);
      const latestChapterNumber = normalizeDecimalNumber(
        item.latest_chapter_number,
      );
      const rawCover = (
        item.cover_portrait_url ||
        item.cover_image_url ||
        ""
      ).trim();
      const externalCoverUrl = isSafeRemoteImageUrl(rawCover) ? rawCover : null;

      const existing = existingByExternalId.get(mangaId);

      if (!existing) {
        const newId = randomUUID();
        const slug = await allocateUniqueSlug(title, mangaId);
        const targetUpdatedAt = upstreamUpdatedAt ?? new Date();
        await db.insert(series).values({
          id: newId,
          publicId: mangaId,
          slug,
          source: SYNC_SOURCE,
          externalId: mangaId,
          title,
          type,
          genre,
          publicationStatus,
          status: "published",
          rank,
          followers,
          rating,
          summary,
          updatedLabel: updatedLabel || null,
          latestChapterNumber,
          externalCoverUrl,
          updatedAt: targetUpdatedAt,
        });
        report.seriesCreated += 1;
        seriesNeedingChapters.push({
          seriesId: newId,
          mangaId,
          updatedAt: targetUpdatedAt,
        });
        continue;
      }

      if (existing.status === "archived") {
        report.seriesSkippedArchived += 1;
        continue;
      }
      if (existing.adminEditedAt) {
        report.seriesSkippedAdmin += 1;
        continue;
      }

      const existingLatestVal = Number(existing.latestChapterNumber ?? 0);
      const incomingLatestVal = Number(latestChapterNumber ?? 0);
      const existingChCount = chapterCountMap.get(existing.id) ?? 0;

      const latestIncreased =
        incomingLatestVal > 0 && incomingLatestVal > existingLatestVal;
      const dateChanged =
        Boolean(updatedLabel) && updatedLabel !== (existing.updatedLabel ?? "");
      const timestampDiffers =
        upstreamUpdatedAt !== null &&
        Math.abs(upstreamUpdatedAt.getTime() - existing.updatedAt.getTime()) >
          60_000;
      const timestampNewer =
        upstreamUpdatedAt !== null &&
        upstreamUpdatedAt.getTime() > existing.updatedAt.getTime() + 60_000;

      const targetUpdatedAt = upstreamUpdatedAt ?? existing.updatedAt;
      const needsMetadataUpdate =
        existing.title !== title ||
        existing.publicationStatus !== publicationStatus ||
        existing.rank !== rank ||
        existing.followers !== followers ||
        existing.rating !== rating ||
        dateChanged ||
        timestampDiffers ||
        latestIncreased ||
        (!existing.coverMediaId &&
          externalCoverUrl &&
          existing.externalCoverUrl !== externalCoverUrl);

      if (needsMetadataUpdate) {
        await db
          .update(series)
          .set({
            title,
            type,
            genre,
            publicationStatus,
            rank,
            followers,
            rating,
            summary: summary || existing.summary,
            updatedLabel: updatedLabel || existing.updatedLabel,
            latestChapterNumber:
              latestChapterNumber ?? existing.latestChapterNumber,
            externalCoverUrl: externalCoverUrl ?? existing.externalCoverUrl,
            updatedAt: targetUpdatedAt,
          })
          .where(eq(series.id, existing.id));
        report.seriesUpdated += 1;
      }

      if (
        latestIncreased ||
        dateChanged ||
        timestampDiffers ||
        existingChCount === 0
      ) {
        seriesNeedingChapters.push({
          seriesId: existing.id,
          mangaId,
          updatedAt: targetUpdatedAt,
        });
      }
    }

    // 4. Fetch & upsert chapters for new/updated series (bounded per run, newest first)
    seriesNeedingChapters.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    const chapterTargets = seriesNeedingChapters.slice(0, maxSeriesChapterFetch);
    for (const target of chapterTargets) {
      await sleep(requestDelayMs);
      const chRes = await fetchShinigamiChapters(target.mangaId, {
        limit: chaptersPerSeries,
        maxPages: 1,
        delayMs: requestDelayMs,
      });
      report.seriesChaptersChecked += 1;
      if (!chRes.ok) {
        report.errors.push(`chapter/list failed for ${target.mangaId}`);
        continue;
      }
      const { highestNumber } = await upsertChaptersForSeries(
        target.seriesId,
        chRes.chapters,
        report,
      );
      if (highestNumber) {
        await db
          .update(series)
          .set({
            latestChapterNumber: highestNumber,
            updatedAt: target.updatedAt,
          })
          .where(
            and(
              eq(series.id, target.seriesId),
              sql`${series.adminEditedAt} IS NULL`,
            ),
          );
      }
    }

    report.finishedAt = new Date().toISOString();
    report.durationMs = Date.now() - startedAt.getTime();
    return report;
  } finally {
    if (lockAcquired) {
      try {
        await lockConn.query("SELECT RELEASE_LOCK(?)", [SYNC_LOCK_NAME]);
      } catch {
        // Ignore release error on disconnect
      }
    }
    lockConn.release();
  }
}

// Per-series 6-hour cooldown for on-demand full chapter list backfill on /series/[id]
const SERIES_SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000;

declare global {
  var __komikSeriesChapterSyncCooldown: Map<string, number> | undefined;
}

function getSeriesCooldownMap() {
  if (!globalThis.__komikSeriesChapterSyncCooldown) {
    globalThis.__komikSeriesChapterSyncCooldown = new Map();
  }
  return globalThis.__komikSeriesChapterSyncCooldown;
}

export async function maybeBackfillSeriesChapters(seriesRow: {
  id: string;
  source: string | null;
  externalId: string | null;
  status: string;
  adminEditedAt: Date | null;
  latestChapterNumber: string | null;
  existingChapterCount: number;
  minChapterNumber?: number | null;
}): Promise<boolean> {
  if (
    seriesRow.status !== "published" ||
    seriesRow.adminEditedAt ||
    !isShinigamiSource(seriesRow.source) ||
    !isUuid(seriesRow.externalId)
  ) {
    return false;
  }

  const latestNum = Number(seriesRow.latestChapterNumber ?? 0);
  const missingOlderChapters =
    seriesRow.existingChapterCount === 0 ||
    (latestNum > 1 &&
      seriesRow.existingChapterCount < Math.floor(latestNum) &&
      (seriesRow.minChapterNumber === null ||
        seriesRow.minChapterNumber === undefined ||
        seriesRow.minChapterNumber > 1));

  if (!missingOlderChapters) {
    return false;
  }

  const map = getSeriesCooldownMap();
  const lastTry = map.get(seriesRow.id) ?? 0;
  const now = Date.now();
  if (now - lastTry < SERIES_SYNC_COOLDOWN_MS) {
    return false;
  }
  map.set(seriesRow.id, now);

  try {
    const res = await fetchShinigamiChapters(seriesRow.externalId, {
      limit: 100,
      maxPages: 40,
      delayMs: 120,
    });
    if (!res.ok || res.chapters.length === 0) return false;
    const counters = {
      chaptersCreated: 0,
      chaptersUpdated: 0,
      chaptersSkippedAdmin: 0,
      chaptersSkippedArchived: 0,
    };
    await upsertChaptersForSeries(seriesRow.id, res.chapters, counters);
    return counters.chaptersCreated > 0 || counters.chaptersUpdated > 0;
  } catch {
    return false;
  }
}
