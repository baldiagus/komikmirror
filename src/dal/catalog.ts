import "server-only";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapterPanels, chapters, mediaAssets, series } from "@/db/schema";
import { fallbackCoverDataUri } from "@/lib/artwork";
import { isShinigamiRemotePanelsEnabled } from "@/lib/env";
import {
  fetchShinigamiChapterPanels,
  isSafeRemoteImageUrl,
  isShinigamiSource,
  isUuid,
} from "@/lib/shinigami";
import { maybeBackfillSeriesChapters } from "@/lib/shinigami-sync";
import { formatChapterNumber, formatDateShort } from "@/lib/slug";
import type { SessionUser } from "@/lib/session";
import { catalogFilterSchema, SERIES_TYPES } from "@/lib/validation";

export interface ChapterSummaryDTO {
  id: string;
  publicId: string;
  number: string;
  title: string;
  sortOrder: number;
  status: "draft" | "published" | "archived";
  updatedAt: string;
}

export interface SeriesCardDTO {
  id: string;
  publicId: string;
  slug: string;
  title: string;
  type: "Manhwa" | "Manhua" | "Manga";
  genre: string;
  publicationStatus: "Ongoing" | "Completed" | "Hiatus";
  status: "draft" | "published" | "archived";
  rank: number;
  followers: number;
  rating: number;
  summary: string;
  updatedLabel: string;
  latestChapterNumber: string | null;
  coverSrc: string;
  latestChapters: ChapterSummaryDTO[];
}

export interface SeriesDetailDTO extends SeriesCardDTO {
  chapters: ChapterSummaryDTO[];
  totalChapters: number;
  chapterPage: number;
  chapterTotalPages: number;
  chapterPageSize: number;
  chapterOrder: "desc" | "asc";
  chapterQuery: string;
  firstChapterPublicId: string | null;
}

export const CHAPTERS_PAGE_SIZE = 30;

export interface PanelDTO {
  id: string;
  mediaId: string;
  position: number;
  url: string;
  width: number | null;
  height: number | null;
  isRemote?: boolean;
}

export interface ReaderChapterDTO {
  series: {
    id: string;
    publicId: string;
    slug: string;
    title: string;
    status: "draft" | "published" | "archived";
  };
  chapter: {
    id: string;
    publicId: string;
    number: string;
    title: string;
    status: "draft" | "published" | "archived";
  };
  panels: PanelDTO[];
  prevChapter: { publicId: string; number: string; title: string } | null;
  nextChapter: { publicId: string; number: string; title: string } | null;
  allChapters: { publicId: string; number: string; title: string }[];
  isPreview: boolean;
}

export const PROJECT_BATCH_SIZE = 20;
const CATALOG_PAGE_SIZE = 48;

function resolveCoverSrc(row: {
  id: string;
  title: string;
  coverMediaId: string | null;
  externalCoverUrl?: string | null;
}): string {
  if (row.coverMediaId) {
    return `/api/media/${row.coverMediaId}`;
  }
  if (isSafeRemoteImageUrl(row.externalCoverUrl)) {
    return row.externalCoverUrl!;
  }
  return fallbackCoverDataUri(row.title, row.id);
}

async function attachLatestChapters(
  rows: (typeof series.$inferSelect)[],
): Promise<SeriesCardDTO[]> {
  if (rows.length === 0) return [];
  const seriesIds = rows.map((r) => r.id);
  const allCh = await db
    .select({
      id: chapters.id,
      seriesId: chapters.seriesId,
      publicId: chapters.publicId,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      sortOrder: chapters.sortOrder,
      status: chapters.status,
      updatedAt: chapters.updatedAt,
    })
    .from(chapters)
    .where(
      and(
        inArray(chapters.seriesId, seriesIds),
        eq(chapters.status, "published"),
        eq(chapters.isSynthetic, false),
      ),
    )
    .orderBy(desc(chapters.chapterNumber), desc(chapters.sortOrder));

  const map = new Map<string, ChapterSummaryDTO[]>();
  for (const ch of allCh) {
    const list = map.get(ch.seriesId) ?? [];
    if (list.length < 2) {
      list.push({
        id: ch.id,
        publicId: ch.publicId,
        number: formatChapterNumber(ch.chapterNumber),
        title: ch.title,
        sortOrder: ch.sortOrder,
        status: ch.status,
        updatedAt: formatDateShort(ch.updatedAt),
      });
      map.set(ch.seriesId, list);
    }
  }

  return rows.map((r) => {
    const latestChapters = map.get(r.id) ?? [];
    const computedLatest =
      latestChapters[0]?.number ??
      (r.latestChapterNumber ? formatChapterNumber(r.latestChapterNumber) : null);
    return {
      id: r.id,
      publicId: r.publicId,
      slug: r.slug,
      title: r.title,
      type: r.type,
      genre: r.genre,
      publicationStatus: r.publicationStatus,
      status: r.status,
      rank: r.rank,
      followers: r.followers,
      rating: Number(r.rating),
      summary: r.summary,
      updatedLabel: formatDateShort(r.updatedAt, r.updatedLabel),
      latestChapterNumber: computedLatest,
      coverSrc: resolveCoverSrc(r),
      latestChapters,
    };
  });
}

export async function getHomeData(rankTab = 0, jenisTab = 0) {
  const safeRank = rankTab >= 0 && rankTab < 4 ? rankTab : 0;
  const safeJenis = jenisTab >= 0 && jenisTab <= SERIES_TYPES.length ? jenisTab : 0;

  const heroRows = await db
    .select()
    .from(series)
    .where(eq(series.status, "published"))
    .orderBy(desc(series.followers), desc(series.rating), desc(series.updatedAt))
    .limit(7);

  let rankOrder = [desc(series.followers), asc(series.rank)];
  if (safeRank === 1) rankOrder = [desc(series.updatedAt), desc(series.followers)];
  if (safeRank === 2) rankOrder = [asc(series.rank), desc(series.followers)];
  if (safeRank === 3) rankOrder = [desc(series.rating), desc(series.followers)];

  const rankedRows = await db
    .select()
    .from(series)
    .where(eq(series.status, "published"))
    .orderBy(...rankOrder)
    .limit(9);

  const projectCondition =
    safeJenis > 0
      ? and(
          eq(series.status, "published"),
          eq(series.type, SERIES_TYPES[safeJenis - 1]),
        )
      : eq(series.status, "published");

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(series)
    .where(projectCondition);

  const projectRows = await db
    .select()
    .from(series)
    .where(projectCondition)
    .orderBy(
      desc(
        sql`EXISTS (SELECT 1 FROM chapters c WHERE c.series_id = ${series.id} AND c.status = 'published' AND c.is_synthetic = false)`,
      ),
      desc(series.updatedAt),
      asc(series.rank),
      asc(series.id),
    )
    .limit(PROJECT_BATCH_SIZE);

  const [hero, ranked, project] = await Promise.all([
    attachLatestChapters(heroRows),
    attachLatestChapters(rankedRows),
    attachLatestChapters(projectRows),
  ]);

  return {
    hero,
    ranked,
    project,
    totalProjectCount: Number(countRow?.count ?? 0),
    rankTab: safeRank,
    jenisTab: safeJenis,
  };
}

export async function getProjectBatch(
  jenisTab: number,
  offset: number,
  limit = PROJECT_BATCH_SIZE,
): Promise<{ items: SeriesCardDTO[]; total: number; hasMore: boolean }> {
  const safeJenis =
    jenisTab >= 0 && jenisTab <= SERIES_TYPES.length ? jenisTab : 0;
  const safeOffset = Math.max(0, Math.min(offset, 50_000));
  const safeLimit = Math.max(1, Math.min(limit, 50));

  const condition =
    safeJenis > 0
      ? and(
          eq(series.status, "published"),
          eq(series.type, SERIES_TYPES[safeJenis - 1]),
        )
      : eq(series.status, "published");

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(series)
    .where(condition);
  const total = Number(countRow?.count ?? 0);

  const rows = await db
    .select()
    .from(series)
    .where(condition)
    .orderBy(
      desc(
        sql`EXISTS (SELECT 1 FROM chapters c WHERE c.series_id = ${series.id} AND c.status = 'published' AND c.is_synthetic = false)`,
      ),
      desc(series.updatedAt),
      asc(series.rank),
      asc(series.id),
    )
    .limit(safeLimit)
    .offset(safeOffset);

  const items = await attachLatestChapters(rows);
  return {
    items,
    total,
    hasMore: safeOffset + items.length < total,
  };
}

export async function listPublishedCatalog(rawParams: {
  q?: string;
  type?: string;
  genre?: string;
  status?: string;
  sort?: string;
  page?: string | number;
}) {
  const parsed = catalogFilterSchema.safeParse(rawParams);
  const filter = parsed.success
    ? parsed.data
    : {
        q: "",
        type: "" as const,
        genre: "",
        status: "" as const,
        sort: "" as const,
        page: 1,
      };

  const conditions = [eq(series.status, "published")];
  if (filter.type) {
    conditions.push(eq(series.type, filter.type));
  }
  if (filter.genre) {
    conditions.push(eq(series.genre, filter.genre));
  }
  if (filter.status) {
    conditions.push(eq(series.publicationStatus, filter.status));
  }
  if (filter.q) {
    conditions.push(like(series.title, `%${filter.q}%`));
  }

  const whereClause = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(series)
    .where(whereClause);

  const total = Number(countRow?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, filter.page));

  let orderByClause = [desc(series.updatedAt), asc(series.id)];
  if (filter.sort === "popular") {
    orderByClause = [desc(series.followers), asc(series.rank), asc(series.id)];
  } else if (filter.sort === "rating") {
    orderByClause = [desc(series.rating), desc(series.followers), asc(series.id)];
  } else if (filter.sort === "name") {
    orderByClause = [asc(series.title), asc(series.id)];
  }

  const rows = await db
    .select()
    .from(series)
    .where(whereClause)
    .orderBy(...orderByClause)
    .limit(CATALOG_PAGE_SIZE)
    .offset((page - 1) * CATALOG_PAGE_SIZE);

  const genreRows = await db
    .selectDistinct({ genre: series.genre })
    .from(series)
    .where(eq(series.status, "published"))
    .orderBy(asc(series.genre));

  const items = await attachLatestChapters(rows);

  return {
    items,
    total,
    page,
    totalPages,
    pageSize: CATALOG_PAGE_SIZE,
    filter,
    genres: genreRows.map((g) => g.genre).filter(Boolean),
  };
}

export async function searchPublishedQuick(q: string) {
  const keyword = q.trim().slice(0, 100);
  const conditions = [eq(series.status, "published")];
  if (keyword) {
    conditions.push(like(series.title, `%${keyword}%`));
  }
  const rows = await db
    .select({
      publicId: series.publicId,
      title: series.title,
      type: series.type,
    })
    .from(series)
    .where(and(...conditions))
    .orderBy(desc(series.followers), asc(series.title))
    .limit(6);
  return rows;
}

export async function getSeriesDetail(
  idOrSlug: string,
  viewer: SessionUser | null,
  options?: {
    page?: string | number;
    order?: string;
    q?: string;
  },
): Promise<SeriesDetailDTO | null> {
  const key = idOrSlug.trim();
  if (!key || key.length > 160) return null;

  const [row] = await db
    .select()
    .from(series)
    .where(
      or(eq(series.publicId, key), eq(series.slug, key), eq(series.id, key)),
    )
    .limit(1);

  if (!row) return null;

  const isAdmin = viewer?.role === "admin";
  if (row.status !== "published" && !isAdmin) {
    return null;
  }

  const baseChCondition = isAdmin
    ? and(eq(chapters.seriesId, row.id), eq(chapters.isSynthetic, false))
    : and(
        eq(chapters.seriesId, row.id),
        eq(chapters.status, "published"),
        eq(chapters.isSynthetic, false),
      );

  // Check total chapter count & oldest chapter for on-demand backfill
  const [statsRow] = await db
    .select({
      total: sql<number>`count(*)`,
      minNum: sql<string | null>`MIN(${chapters.chapterNumber})`,
    })
    .from(chapters)
    .where(baseChCondition);

  const initialTotal = Number(statsRow?.total ?? 0);
  const oldestChapterNum =
    statsRow?.minNum !== null && statsRow?.minNum !== undefined
      ? Number(statsRow.minNum)
      : null;

  if (isShinigamiRemotePanelsEnabled()) {
    await maybeBackfillSeriesChapters({
      id: row.id,
      source: row.source,
      externalId: row.externalId,
      status: row.status,
      adminEditedAt: row.adminEditedAt,
      latestChapterNumber: row.latestChapterNumber,
      existingChapterCount: initialTotal,
      minChapterNumber: oldestChapterNum,
    });
  }

  const chapterOrder: "desc" | "asc" =
    options?.order === "asc" ? "asc" : "desc";
  const chapterQuery = (options?.q ?? "").trim().slice(0, 60);

  const filteredConditions = [baseChCondition];
  if (chapterQuery) {
    const numericQuery = chapterQuery.replace(/^ch(?:apter)?\.?\s*/i, "").trim();
    const matchParts = [like(chapters.title, `%${chapterQuery}%`)];
    if (numericQuery) {
      matchParts.push(
        sql`CAST(${chapters.chapterNumber} AS CHAR) LIKE ${`%${numericQuery}%`}`,
      );
    }
    filteredConditions.push(or(...matchParts)!);
  }
  const filteredWhere = and(...filteredConditions);

  const [filteredCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(chapters)
    .where(filteredWhere);

  const totalChapters = Number(filteredCountRow?.count ?? 0);
  const chapterTotalPages = Math.max(
    1,
    Math.ceil(totalChapters / CHAPTERS_PAGE_SIZE),
  );
  const requestedPage = Math.max(1, Math.floor(Number(options?.page) || 1));
  const chapterPage = Math.min(chapterTotalPages, requestedPage);

  const orderByClause =
    chapterOrder === "asc"
      ? [asc(chapters.chapterNumber), asc(chapters.sortOrder), asc(chapters.id)]
      : [
          desc(chapters.chapterNumber),
          desc(chapters.sortOrder),
          desc(chapters.id),
        ];

  const [chRows, firstPublishedRows, latestPublishedRows] = await Promise.all([
    db
      .select()
      .from(chapters)
      .where(filteredWhere)
      .orderBy(...orderByClause)
      .limit(CHAPTERS_PAGE_SIZE)
      .offset((chapterPage - 1) * CHAPTERS_PAGE_SIZE),
    db
      .select({ publicId: chapters.publicId })
      .from(chapters)
      .where(
        and(
          eq(chapters.seriesId, row.id),
          eq(chapters.status, "published"),
          eq(chapters.isSynthetic, false),
        ),
      )
      .orderBy(asc(chapters.chapterNumber), asc(chapters.sortOrder))
      .limit(1),
    db
      .select({
        id: chapters.id,
        publicId: chapters.publicId,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        sortOrder: chapters.sortOrder,
        status: chapters.status,
        updatedAt: chapters.updatedAt,
      })
      .from(chapters)
      .where(
        and(
          eq(chapters.seriesId, row.id),
          eq(chapters.status, "published"),
          eq(chapters.isSynthetic, false),
        ),
      )
      .orderBy(desc(chapters.chapterNumber), desc(chapters.sortOrder))
      .limit(2),
  ]);

  const chapterDtos: ChapterSummaryDTO[] = chRows.map((ch) => ({
    id: ch.id,
    publicId: ch.publicId,
    number: formatChapterNumber(ch.chapterNumber),
    title: ch.title,
    sortOrder: ch.sortOrder,
    status: ch.status,
    updatedAt: formatDateShort(ch.updatedAt),
  }));

  const latestDtos: ChapterSummaryDTO[] = latestPublishedRows.map((ch) => ({
    id: ch.id,
    publicId: ch.publicId,
    number: formatChapterNumber(ch.chapterNumber),
    title: ch.title,
    sortOrder: ch.sortOrder,
    status: ch.status,
    updatedAt: formatDateShort(ch.updatedAt),
  }));

  return {
    id: row.id,
    publicId: row.publicId,
    slug: row.slug,
    title: row.title,
    type: row.type,
    genre: row.genre,
    publicationStatus: row.publicationStatus,
    status: row.status,
    rank: row.rank,
    followers: row.followers,
    rating: Number(row.rating),
    summary: row.summary,
    updatedLabel: formatDateShort(row.updatedAt, row.updatedLabel),
    latestChapterNumber:
      latestDtos[0]?.number ??
      (row.latestChapterNumber
        ? formatChapterNumber(row.latestChapterNumber)
        : null),
    coverSrc: resolveCoverSrc(row),
    latestChapters: latestDtos,
    chapters: chapterDtos,
    totalChapters,
    chapterPage,
    chapterTotalPages,
    chapterPageSize: CHAPTERS_PAGE_SIZE,
    chapterOrder,
    chapterQuery,
    firstChapterPublicId: firstPublishedRows[0]?.publicId ?? null,
  };
}

export async function getChapterForReader(
  chapterIdOrPublicId: string,
  viewer: SessionUser | null,
): Promise<ReaderChapterDTO | null> {
  const key = chapterIdOrPublicId.trim();
  if (!key || key.length > 160) return null;

  const [ch] = await db
    .select()
    .from(chapters)
    .where(or(eq(chapters.publicId, key), eq(chapters.id, key)))
    .limit(1);

  if (!ch) return null;

  const [parent] = await db
    .select()
    .from(series)
    .where(eq(series.id, ch.seriesId))
    .limit(1);

  if (!parent) return null;

  const isPubliclyVisible =
    parent.status === "published" &&
    ch.status === "published" &&
    !ch.isSynthetic;
  const isAdmin = viewer?.role === "admin";

  if (!isPubliclyVisible && !isAdmin) {
    return null;
  }

  const siblingCondition = isPubliclyVisible
    ? and(
        eq(chapters.seriesId, parent.id),
        eq(chapters.status, "published"),
        eq(chapters.isSynthetic, false),
      )
    : and(eq(chapters.seriesId, parent.id), eq(chapters.isSynthetic, false));

  const siblings = await db
    .select({
      id: chapters.id,
      publicId: chapters.publicId,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      sortOrder: chapters.sortOrder,
    })
    .from(chapters)
    .where(siblingCondition)
    .orderBy(asc(chapters.chapterNumber), asc(chapters.sortOrder), asc(chapters.id));

  const idx = siblings.findIndex((s) => s.id === ch.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const panelRows = await db
    .select({
      id: chapterPanels.id,
      mediaId: chapterPanels.mediaId,
      position: chapterPanels.position,
      width: mediaAssets.width,
      height: mediaAssets.height,
    })
    .from(chapterPanels)
    .innerJoin(mediaAssets, eq(chapterPanels.mediaId, mediaAssets.id))
    .where(eq(chapterPanels.chapterId, ch.id))
    .orderBy(asc(chapterPanels.position));

  let panels: PanelDTO[] = panelRows.map((p) => ({
    id: p.id,
    mediaId: p.mediaId,
    position: p.position,
    url: `/api/media/${p.mediaId}`,
    width: p.width,
    height: p.height,
    isRemote: false,
  }));

  if (
    panels.length === 0 &&
    isShinigamiRemotePanelsEnabled() &&
    isShinigamiSource(ch.source) &&
    isUuid(ch.externalId) &&
    !ch.isSynthetic
  ) {
    const remotePanels = await fetchShinigamiChapterPanels(ch.externalId);
    panels = remotePanels.map((p) => ({
      id: p.id,
      mediaId: "",
      position: p.position,
      url: p.url,
      width: null,
      height: null,
      isRemote: true,
    }));
  }

  return {
    series: {
      id: parent.id,
      publicId: parent.publicId,
      slug: parent.slug,
      title: parent.title,
      status: parent.status,
    },
    chapter: {
      id: ch.id,
      publicId: ch.publicId,
      number: formatChapterNumber(ch.chapterNumber),
      title: ch.title,
      status: ch.status,
    },
    panels,
    prevChapter: prev
      ? {
          publicId: prev.publicId,
          number: formatChapterNumber(prev.chapterNumber),
          title: prev.title,
        }
      : null,
    nextChapter: next
      ? {
          publicId: next.publicId,
          number: formatChapterNumber(next.chapterNumber),
          title: next.title,
        }
      : null,
    allChapters: [...siblings].reverse().map((s) => ({
      publicId: s.publicId,
      number: formatChapterNumber(s.chapterNumber),
      title: s.title,
    })),
    isPreview: !isPubliclyVisible,
  };
}

export async function getMediaAccessRecord(
  mediaId: string,
  viewer: SessionUser | null,
): Promise<
  | {
      allowed: true;
      isPublic: boolean;
      storageKey: string;
      mimeType: string;
      byteSize: number;
    }
  | { allowed: false }
> {
  if (!/^[0-9a-f-]{36}$/.test(mediaId)) {
    return { allowed: false };
  }

  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, mediaId))
    .limit(1);

  if (!asset) return { allowed: false };

  let isPublic = false;

  if (asset.kind === "cover") {
    const [pubSeries] = await db
      .select({ id: series.id })
      .from(series)
      .where(
        and(eq(series.coverMediaId, asset.id), eq(series.status, "published")),
      )
      .limit(1);
    isPublic = Boolean(pubSeries);
  } else {
    const [pubPanel] = await db
      .select({ id: chapterPanels.id })
      .from(chapterPanels)
      .innerJoin(chapters, eq(chapterPanels.chapterId, chapters.id))
      .innerJoin(series, eq(chapters.seriesId, series.id))
      .where(
        and(
          eq(chapterPanels.mediaId, asset.id),
          eq(chapters.status, "published"),
          eq(chapters.isSynthetic, false),
          eq(series.status, "published"),
        ),
      )
      .limit(1);
    isPublic = Boolean(pubPanel);
  }

  if (!isPublic && viewer?.role !== "admin") {
    return { allowed: false };
  }

  return {
    allowed: true,
    isPublic,
    storageKey: asset.storageKey,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
  };
}
