import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  chapters,
  series,
  userBookmarks,
  userHistory,
  userQueue,
} from "@/db/schema";
import { fallbackCoverDataUri } from "@/lib/artwork";
import { AppError } from "@/lib/errors";
import { isSafeRemoteImageUrl } from "@/lib/shinigami";
import { formatChapterNumber, formatDateShort } from "@/lib/slug";
import { browserLibraryImportSchema } from "@/lib/validation";

const MAX_QUEUE_SIZE = 30;

function resolveLibraryCoverSrc(row: {
  id: string;
  title: string;
  coverMediaId: string | null;
  externalCoverUrl?: string | null;
}): string {
  if (row.coverMediaId) return `/api/media/${row.coverMediaId}`;
  if (isSafeRemoteImageUrl(row.externalCoverUrl)) return row.externalCoverUrl!;
  return fallbackCoverDataUri(row.title, row.id);
}

export interface ContinueReadingItemDTO {
  seriesId: string;
  seriesPublicId: string;
  seriesTitle: string;
  coverSrc: string;
  chapterId: string;
  chapterPublicId: string;
  chapterNumber: string;
  latestChapterNumber: string | null;
  readAt: string;
}

export interface UserSeriesReadStateDTO {
  readChapterIds: string[];
  lastReadChapter: {
    chapterId: string;
    publicId: string;
    number: string;
  } | null;
}

export interface LibrarySeriesItemDTO {
  id: string;
  publicId: string;
  slug: string;
  title: string;
  type: "Manhwa" | "Manhua" | "Manga";
  genre: string;
  rating: number;
  latestChapterNumber: string | null;
  coverSrc: string;
  savedAt: string;
  updatedAt: string;
}

export interface LibraryHistoryItemDTO {
  seriesId: string;
  seriesPublicId: string;
  seriesTitle: string;
  coverSrc: string;
  chapterId: string;
  chapterPublicId: string;
  chapterNumber: string;
  latestChapterNumber: string | null;
  progressPercent: number;
  readAt: string;
}

export interface UserLibraryDTO {
  counts: {
    bookmarks: number;
    history: number;
    queue: number;
    maxQueue: number;
  };
  bookmarks: LibrarySeriesItemDTO[];
  queue: LibrarySeriesItemDTO[];
  history: LibraryHistoryItemDTO[];
}

export async function getUserSeriesFlags(
  userId: string,
  seriesId: string,
): Promise<{ bookmarked: boolean; queued: boolean }> {
  const [bm, q] = await Promise.all([
    db
      .select({ seriesId: userBookmarks.seriesId })
      .from(userBookmarks)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.seriesId, seriesId),
        ),
      )
      .limit(1),
    db
      .select({ seriesId: userQueue.seriesId })
      .from(userQueue)
      .where(
        and(eq(userQueue.userId, userId), eq(userQueue.seriesId, seriesId)),
      )
      .limit(1),
  ]);
  return {
    bookmarked: bm.length > 0,
    queued: q.length > 0,
  };
}

export async function getUserSeriesReadState(
  userId: string,
  seriesId: string,
): Promise<UserSeriesReadStateDTO> {
  const rows = await db
    .select({
      chapterId: chapters.id,
      publicId: chapters.publicId,
      chapterNumber: chapters.chapterNumber,
      readAt: userHistory.readAt,
    })
    .from(userHistory)
    .innerJoin(chapters, eq(userHistory.chapterId, chapters.id))
    .where(
      and(
        eq(userHistory.userId, userId),
        eq(userHistory.seriesId, seriesId),
        eq(chapters.status, "published"),
        eq(chapters.isSynthetic, false),
      ),
    )
    .orderBy(desc(userHistory.readAt));

  const readChapterIds = rows.map((r) => r.chapterId);
  const latest = rows[0]
    ? {
        chapterId: rows[0].chapterId,
        publicId: rows[0].publicId,
        number: formatChapterNumber(rows[0].chapterNumber),
      }
    : null;

  return {
    readChapterIds,
    lastReadChapter: latest,
  };
}

export async function getContinueReadingList(
  userId: string,
  limit = 6,
): Promise<ContinueReadingItemDTO[]> {
  const safeLimit = Math.max(1, Math.min(20, limit));
  const rows = await db
    .select({
      seriesId: series.id,
      seriesPublicId: series.publicId,
      seriesTitle: series.title,
      coverMediaId: series.coverMediaId,
      externalCoverUrl: series.externalCoverUrl,
      latestChapterNumber: series.latestChapterNumber,
      chapterId: chapters.id,
      chapterPublicId: chapters.publicId,
      chapterNumber: chapters.chapterNumber,
      readAt: userHistory.readAt,
    })
    .from(userHistory)
    .innerJoin(chapters, eq(userHistory.chapterId, chapters.id))
    .innerJoin(series, eq(userHistory.seriesId, series.id))
    .where(
      and(
        eq(userHistory.userId, userId),
        eq(series.status, "published"),
        eq(chapters.status, "published"),
        eq(chapters.isSynthetic, false),
      ),
    )
    .orderBy(desc(userHistory.readAt))
    .limit(safeLimit * 5);

  const seen = new Set<string>();
  const result: ContinueReadingItemDTO[] = [];
  for (const r of rows) {
    if (seen.has(r.seriesId)) continue;
    seen.add(r.seriesId);
    result.push({
      seriesId: r.seriesId,
      seriesPublicId: r.seriesPublicId,
      seriesTitle: r.seriesTitle,
      coverSrc: resolveLibraryCoverSrc({
        id: r.seriesId,
        title: r.seriesTitle,
        coverMediaId: r.coverMediaId,
        externalCoverUrl: r.externalCoverUrl,
      }),
      chapterId: r.chapterId,
      chapterPublicId: r.chapterPublicId,
      chapterNumber: formatChapterNumber(r.chapterNumber),
      latestChapterNumber: r.latestChapterNumber
        ? formatChapterNumber(r.latestChapterNumber)
        : null,
      readAt: formatDateShort(r.readAt),
    });
    if (result.length >= safeLimit) break;
  }
  return result;
}

export async function getUserLibrary(
  userId: string,
  filter = 0,
): Promise<UserLibraryDTO> {
  const sortByLatest = filter === 1;

  const bmRows = await db
    .select({
      id: series.id,
      publicId: series.publicId,
      slug: series.slug,
      title: series.title,
      type: series.type,
      genre: series.genre,
      rating: series.rating,
      latestChapterNumber: series.latestChapterNumber,
      coverMediaId: series.coverMediaId,
      externalCoverUrl: series.externalCoverUrl,
      updatedAt: series.updatedAt,
      savedAt: userBookmarks.createdAt,
    })
    .from(userBookmarks)
    .innerJoin(series, eq(userBookmarks.seriesId, series.id))
    .where(
      and(eq(userBookmarks.userId, userId), eq(series.status, "published")),
    )
    .orderBy(
      sortByLatest ? desc(series.updatedAt) : desc(userBookmarks.createdAt),
    );

  const qRows = await db
    .select({
      id: series.id,
      publicId: series.publicId,
      slug: series.slug,
      title: series.title,
      type: series.type,
      genre: series.genre,
      rating: series.rating,
      latestChapterNumber: series.latestChapterNumber,
      coverMediaId: series.coverMediaId,
      externalCoverUrl: series.externalCoverUrl,
      updatedAt: series.updatedAt,
      savedAt: userQueue.createdAt,
    })
    .from(userQueue)
    .innerJoin(series, eq(userQueue.seriesId, series.id))
    .where(and(eq(userQueue.userId, userId), eq(series.status, "published")))
    .orderBy(
      sortByLatest ? desc(series.updatedAt) : asc(userQueue.position),
      desc(userQueue.createdAt),
    );

  const histRows = await db
    .select({
      seriesId: series.id,
      seriesPublicId: series.publicId,
      seriesTitle: series.title,
      coverMediaId: series.coverMediaId,
      externalCoverUrl: series.externalCoverUrl,
      latestChapterNumber: series.latestChapterNumber,
      chapterId: chapters.id,
      chapterPublicId: chapters.publicId,
      chapterNumber: chapters.chapterNumber,
      progressPercent: userHistory.progressPercent,
      readAt: userHistory.readAt,
      seriesUpdatedAt: series.updatedAt,
    })
    .from(userHistory)
    .innerJoin(chapters, eq(userHistory.chapterId, chapters.id))
    .innerJoin(series, eq(userHistory.seriesId, series.id))
    .where(
      and(
        eq(userHistory.userId, userId),
        eq(series.status, "published"),
        eq(chapters.status, "published"),
        eq(chapters.isSynthetic, false),
      ),
    )
    .orderBy(
      sortByLatest ? desc(series.updatedAt) : desc(userHistory.readAt),
    );

  // Deduplicate history per series keeping most recent chapter, while keeping total history count
  const seenSeries = new Set<string>();
  const latestHistoryPerSeries: LibraryHistoryItemDTO[] = [];
  for (const h of histRows) {
    if (seenSeries.has(h.seriesId)) continue;
    seenSeries.add(h.seriesId);
    latestHistoryPerSeries.push({
      seriesId: h.seriesId,
      seriesPublicId: h.seriesPublicId,
      seriesTitle: h.seriesTitle,
      coverSrc: resolveLibraryCoverSrc({
        id: h.seriesId,
        title: h.seriesTitle,
        coverMediaId: h.coverMediaId,
        externalCoverUrl: h.externalCoverUrl,
      }),
      chapterId: h.chapterId,
      chapterPublicId: h.chapterPublicId,
      chapterNumber: formatChapterNumber(h.chapterNumber),
      latestChapterNumber: h.latestChapterNumber
        ? formatChapterNumber(h.latestChapterNumber)
        : null,
      progressPercent: h.progressPercent,
      readAt: formatDateShort(h.readAt),
    });
  }

  const mapSeries = (
    r: (typeof bmRows)[number],
  ): LibrarySeriesItemDTO => ({
    id: r.id,
    publicId: r.publicId,
    slug: r.slug,
    title: r.title,
    type: r.type,
    genre: r.genre,
    rating: Number(r.rating),
    latestChapterNumber: r.latestChapterNumber
      ? formatChapterNumber(r.latestChapterNumber)
      : null,
    coverSrc: resolveLibraryCoverSrc(r),
    savedAt: formatDateShort(r.savedAt),
    updatedAt: formatDateShort(r.updatedAt),
  });

  return {
    counts: {
      bookmarks: bmRows.length,
      history: histRows.length,
      queue: qRows.length,
      maxQueue: MAX_QUEUE_SIZE,
    },
    bookmarks: bmRows.map(mapSeries),
    queue: qRows.map(mapSeries),
    history: latestHistoryPerSeries,
  };
}

export async function toggleUserBookmark(
  userId: string,
  seriesId: string,
): Promise<{ bookmarked: boolean }> {
  if (!/^[0-9a-f-]{36}$/.test(seriesId)) {
    throw new AppError("VALIDATION_ERROR", "ID seri tidak valid.");
  }

  const [pub] = await db
    .select({ id: series.id })
    .from(series)
    .where(and(eq(series.id, seriesId), eq(series.status, "published")))
    .limit(1);
  if (!pub) {
    throw new AppError("NOT_FOUND", "Seri tidak tersedia.");
  }

  const [existing] = await db
    .select({ seriesId: userBookmarks.seriesId })
    .from(userBookmarks)
    .where(
      and(
        eq(userBookmarks.userId, userId),
        eq(userBookmarks.seriesId, seriesId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(userBookmarks)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.seriesId, seriesId),
        ),
      );
    return { bookmarked: false };
  }

  await db
    .insert(userBookmarks)
    .values({ userId, seriesId })
    .onDuplicateKeyUpdate({ set: { createdAt: sql`created_at` } });
  return { bookmarked: true };
}

export async function toggleUserQueue(
  userId: string,
  seriesId: string,
): Promise<{ queued: boolean }> {
  if (!/^[0-9a-f-]{36}$/.test(seriesId)) {
    throw new AppError("VALIDATION_ERROR", "ID seri tidak valid.");
  }

  const [pub] = await db
    .select({ id: series.id })
    .from(series)
    .where(and(eq(series.id, seriesId), eq(series.status, "published")))
    .limit(1);
  if (!pub) {
    throw new AppError("NOT_FOUND", "Seri tidak tersedia.");
  }

  const [existing] = await db
    .select({ seriesId: userQueue.seriesId })
    .from(userQueue)
    .where(and(eq(userQueue.userId, userId), eq(userQueue.seriesId, seriesId)))
    .limit(1);

  if (existing) {
    await db
      .delete(userQueue)
      .where(
        and(eq(userQueue.userId, userId), eq(userQueue.seriesId, seriesId)),
      );
    return { queued: false };
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userQueue)
    .where(eq(userQueue.userId, userId));

  if (Number(countRow?.count ?? 0) >= MAX_QUEUE_SIZE) {
    throw new AppError(
      "CONFLICT",
      `Antrean sudah mencapai batas maksimal ${MAX_QUEUE_SIZE} judul.`,
    );
  }

  const [maxPosRow] = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${userQueue.position}), 0)` })
    .from(userQueue)
    .where(eq(userQueue.userId, userId));

  await db
    .insert(userQueue)
    .values({
      userId,
      seriesId,
      position: Number(maxPosRow?.maxPos ?? 0) + 1,
    })
    .onDuplicateKeyUpdate({ set: { position: sql`position` } });
  return { queued: true };
}

export async function recordUserHistory(
  userId: string,
  chapterId: string,
  progressPercent = 100,
): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(chapterId)) return;

  const [ch] = await db
    .select({
      id: chapters.id,
      seriesId: chapters.seriesId,
    })
    .from(chapters)
    .innerJoin(series, eq(chapters.seriesId, series.id))
    .where(
      and(
        eq(chapters.id, chapterId),
        eq(chapters.status, "published"),
        eq(chapters.isSynthetic, false),
        eq(series.status, "published"),
      ),
    )
    .limit(1);

  if (!ch) return;

  const safeProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const now = new Date();
  await db
    .insert(userHistory)
    .values({
      id: randomUUID(),
      userId,
      seriesId: ch.seriesId,
      chapterId: ch.id,
      progressPercent: safeProgress,
      readAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        progressPercent: safeProgress,
        readAt: now,
      },
    });
}

export async function clearUserHistory(userId: string): Promise<void> {
  await db.delete(userHistory).where(eq(userHistory.userId, userId));
}

export async function importBrowserLibraryForUser(
  userId: string,
  rawPayload: unknown,
): Promise<{
  bookmarksImported: number;
  queueImported: number;
  historyImported: number;
  unmappedCount: number;
}> {
  const parsed = browserLibraryImportSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Format data browser tidak valid untuk diimpor.",
    );
  }
  const payload = parsed.data;
  const bookmarkKeys = [...new Set(payload.bookmarks)];
  const queueKeys = [...new Set(payload.queue)];
  const historyKeys = [...new Set(payload.history)];

  let bookmarksImported = 0;
  let queueImported = 0;
  let historyImported = 0;
  let unmappedCount = 0;

  const seriesKeys = [...new Set([...bookmarkKeys, ...queueKeys])];
  const seriesMap = new Map<string, string>();

  if (seriesKeys.length > 0) {
    const matchedSeries = await db
      .select({
        id: series.id,
        publicId: series.publicId,
        slug: series.slug,
      })
      .from(series)
      .where(
        and(
          eq(series.status, "published"),
          or(
            inArray(series.publicId, seriesKeys),
            inArray(series.slug, seriesKeys),
            inArray(series.id, seriesKeys),
          ),
        ),
      );
    for (const s of matchedSeries) {
      seriesMap.set(s.id, s.id);
      seriesMap.set(s.publicId, s.id);
      seriesMap.set(s.slug, s.id);
    }
  }

  for (const key of bookmarkKeys) {
    const sid = seriesMap.get(key);
    if (!sid) {
      unmappedCount++;
      continue;
    }
    await db
      .insert(userBookmarks)
      .values({ userId, seriesId: sid })
      .onDuplicateKeyUpdate({ set: { createdAt: sql`created_at` } });
    bookmarksImported++;
  }

  const [existingQueueRow] = await db
    .select({
      count: sql<number>`count(*)`,
      maxPos: sql<number>`COALESCE(MAX(${userQueue.position}), 0)`,
    })
    .from(userQueue)
    .where(eq(userQueue.userId, userId));

  let currentQueueCount = Number(existingQueueRow?.count ?? 0);
  let nextPos = Number(existingQueueRow?.maxPos ?? 0) + 1;

  for (const key of queueKeys) {
    const sid = seriesMap.get(key);
    if (!sid) {
      unmappedCount++;
      continue;
    }
    const [exists] = await db
      .select({ seriesId: userQueue.seriesId })
      .from(userQueue)
      .where(and(eq(userQueue.userId, userId), eq(userQueue.seriesId, sid)))
      .limit(1);
    if (exists) {
      queueImported++;
      continue;
    }
    if (currentQueueCount >= MAX_QUEUE_SIZE) continue;
    await db
      .insert(userQueue)
      .values({ userId, seriesId: sid, position: nextPos++ })
      .onDuplicateKeyUpdate({ set: { position: sql`position` } });
    currentQueueCount++;
    queueImported++;
  }

  if (historyKeys.length > 0) {
    const matchedChapters = await db
      .select({
        id: chapters.id,
        publicId: chapters.publicId,
        seriesId: chapters.seriesId,
      })
      .from(chapters)
      .innerJoin(series, eq(chapters.seriesId, series.id))
      .where(
        and(
          eq(chapters.status, "published"),
          eq(chapters.isSynthetic, false),
          eq(series.status, "published"),
          or(
            inArray(chapters.publicId, historyKeys),
            inArray(chapters.id, historyKeys),
          ),
        ),
      );
    const chMap = new Map<string, { id: string; seriesId: string }>();
    for (const ch of matchedChapters) {
      chMap.set(ch.id, { id: ch.id, seriesId: ch.seriesId });
      chMap.set(ch.publicId, { id: ch.id, seriesId: ch.seriesId });
    }

    const baseTime = Date.now();
    for (let i = 0; i < historyKeys.length; i++) {
      const target = chMap.get(historyKeys[i]);
      if (!target) {
        unmappedCount++;
        continue;
      }
      const readAt = new Date(baseTime - i * 1000);
      await db
        .insert(userHistory)
        .values({
          id: randomUUID(),
          userId,
          seriesId: target.seriesId,
          chapterId: target.id,
          progressPercent: 100,
          readAt,
        })
        .onDuplicateKeyUpdate({
          set: {
            readAt: sql`GREATEST(${userHistory.readAt}, VALUES(read_at))`,
          },
        });
      historyImported++;
    }
  }

  return {
    bookmarksImported,
    queueImported,
    historyImported,
    unmappedCount,
  };
}
