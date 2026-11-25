import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapterPanels, chapters, mediaAssets, series } from "@/db/schema";
import { AppError } from "@/lib/errors";
import {
  mediaFileExists,
  removeMediaFile,
  stageAndCommitMediaBuffer,
} from "@/lib/media";
import { formatChapterNumber, formatDateShort, slugify } from "@/lib/slug";
import type { SessionUser } from "@/lib/session";
import {
  chapterStatusSchema,
  createChapterSchema,
  createSeriesSchema,
  reorderPanelsSchema,
  seriesStatusSchema,
  updateChapterSchema,
  updateSeriesSchema,
} from "@/lib/validation";

function assertAdmin(actor: SessionUser) {
  if (!actor || actor.role !== "admin") {
    throw new AppError("FORBIDDEN", "Akses khusus admin.");
  }
}

export async function listAdminSeries(
  actor: SessionUser,
  params?: { q?: string; status?: string; page?: number },
) {
  assertAdmin(actor);
  const q = (params?.q ?? "").trim().slice(0, 100);
  const status = params?.status ?? "";
  const page = Math.max(1, params?.page ?? 1);
  const perPage = 30;

  const conditions = [];
  if (q) conditions.push(like(series.title, `%${q}%`));
  if (status === "draft" || status === "published" || status === "archived") {
    conditions.push(eq(series.status, status));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(series)
    .where(whereClause);

  const rows = await db
    .select({
      id: series.id,
      publicId: series.publicId,
      slug: series.slug,
      title: series.title,
      type: series.type,
      genre: series.genre,
      publicationStatus: series.publicationStatus,
      status: series.status,
      rating: series.rating,
      coverMediaId: series.coverMediaId,
      updatedAt: series.updatedAt,
      adminEditedAt: series.adminEditedAt,
    })
    .from(series)
    .where(whereClause)
    .orderBy(desc(series.updatedAt), asc(series.id))
    .limit(perPage)
    .offset((page - 1) * perPage);

  const total = Number(countRow?.count ?? 0);
  return {
    items: rows.map((r) => ({
      ...r,
      rating: Number(r.rating),
      coverUrl: r.coverMediaId ? `/api/media/${r.coverMediaId}` : null,
      updatedAt: formatDateShort(r.updatedAt),
      adminEdited: Boolean(r.adminEditedAt),
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getAdminSeriesById(actor: SessionUser, seriesId: string) {
  assertAdmin(actor);
  const [row] = await db
    .select()
    .from(series)
    .where(eq(series.id, seriesId))
    .limit(1);

  if (!row) return null;

  const chapterRows = await db
    .select({
      id: chapters.id,
      publicId: chapters.publicId,
      chapterNumber: chapters.chapterNumber,
      sortOrder: chapters.sortOrder,
      title: chapters.title,
      status: chapters.status,
      isSynthetic: chapters.isSynthetic,
      updatedAt: chapters.updatedAt,
      panelCount: sql<number>`(SELECT COUNT(*) FROM chapter_panels cp WHERE cp.chapter_id = ${chapters.id})`,
    })
    .from(chapters)
    .where(eq(chapters.seriesId, row.id))
    .orderBy(desc(chapters.sortOrder), desc(chapters.chapterNumber));

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
    rating: row.rating,
    summary: row.summary,
    coverMediaId: row.coverMediaId,
    coverUrl: row.coverMediaId ? `/api/media/${row.coverMediaId}` : null,
    externalCoverUrl: row.externalCoverUrl,
    chapters: chapterRows.map((ch) => ({
      id: ch.id,
      publicId: ch.publicId,
      number: formatChapterNumber(ch.chapterNumber),
      rawNumber: ch.chapterNumber,
      sortOrder: ch.sortOrder,
      title: ch.title,
      status: ch.status,
      isSynthetic: ch.isSynthetic,
      panelCount: Number(ch.panelCount ?? 0),
      updatedAt: formatDateShort(ch.updatedAt),
    })),
  };
}

export async function getAdminChapterById(actor: SessionUser, chapterId: string) {
  assertAdmin(actor);
  const [ch] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!ch) return null;

  const [parent] = await db
    .select({
      id: series.id,
      publicId: series.publicId,
      title: series.title,
      status: series.status,
    })
    .from(series)
    .where(eq(series.id, ch.seriesId))
    .limit(1);
  if (!parent) return null;

  const panels = await db
    .select({
      id: chapterPanels.id,
      mediaId: chapterPanels.mediaId,
      position: chapterPanels.position,
      mimeType: mediaAssets.mimeType,
      byteSize: mediaAssets.byteSize,
      width: mediaAssets.width,
      height: mediaAssets.height,
    })
    .from(chapterPanels)
    .innerJoin(mediaAssets, eq(chapterPanels.mediaId, mediaAssets.id))
    .where(eq(chapterPanels.chapterId, ch.id))
    .orderBy(asc(chapterPanels.position));

  return {
    id: ch.id,
    seriesId: ch.seriesId,
    publicId: ch.publicId,
    chapterNumber: formatChapterNumber(ch.chapterNumber),
    sortOrder: ch.sortOrder,
    title: ch.title,
    status: ch.status,
    isSynthetic: ch.isSynthetic,
    series: parent,
    panels: panels.map((p) => ({
      ...p,
      url: `/api/media/${p.mediaId}`,
    })),
  };
}

export async function createSeriesRecord(
  actor: SessionUser,
  rawInput: unknown,
): Promise<{ id: string; slug: string; publicId: string }> {
  assertAdmin(actor);
  const parsed = createSeriesSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Data seri tidak valid.",
      parsed.error.flatten().fieldErrors,
    );
  }
  const input = parsed.data;
  const id = randomUUID();
  const baseSlug = input.slug?.trim() || slugify(input.title) || `series-${id.slice(0, 8)}`;
  const slug = baseSlug.slice(0, 150);

  // Check uniqueness cleanly to return CONFLICT
  const [existing] = await db
    .select({ id: series.id })
    .from(series)
    .where(eq(series.slug, slug))
    .limit(1);
  if (existing) {
    throw new AppError("CONFLICT", `Slug "${slug}" sudah digunakan seri lain.`);
  }

  const now = new Date();
  await db.insert(series).values({
    id,
    publicId: slug,
    slug,
    source: "admin",
    externalId: id,
    title: input.title,
    type: input.type,
    genre: input.genre,
    publicationStatus: input.publicationStatus,
    status: "draft",
    rank: input.rank,
    followers: input.followers,
    rating: input.rating,
    summary: input.summary,
    adminEditedAt: now,
  });

  return { id, slug, publicId: slug };
}

export async function updateSeriesRecord(
  actor: SessionUser,
  rawInput: unknown,
): Promise<{ id: string; slug: string }> {
  assertAdmin(actor);
  const parsed = updateSeriesSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Perubahan data seri tidak valid.",
      parsed.error.flatten().fieldErrors,
    );
  }
  const input = parsed.data;
  const [current] = await db
    .select()
    .from(series)
    .where(eq(series.id, input.seriesId))
    .limit(1);
  if (!current) {
    throw new AppError("NOT_FOUND", "Seri tidak ditemukan.");
  }

  const nextSlug = (input.slug?.trim() || current.slug).slice(0, 150);
  if (nextSlug !== current.slug) {
    const [conflict] = await db
      .select({ id: series.id })
      .from(series)
      .where(eq(series.slug, nextSlug))
      .limit(1);
    if (conflict && conflict.id !== current.id) {
      throw new AppError("CONFLICT", `Slug "${nextSlug}" sudah digunakan.`);
    }
  }

  await db
    .update(series)
    .set({
      title: input.title,
      slug: nextSlug,
      type: input.type,
      genre: input.genre,
      publicationStatus: input.publicationStatus,
      rating: input.rating,
      rank: input.rank,
      followers: input.followers,
      summary: input.summary,
      adminEditedAt: new Date(),
    })
    .where(eq(series.id, current.id));

  return { id: current.id, slug: nextSlug };
}

export async function setSeriesStatus(
  actor: SessionUser,
  rawInput: unknown,
): Promise<{ id: string; status: "draft" | "published" | "archived" }> {
  assertAdmin(actor);
  const parsed = seriesStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Status seri tidak valid.");
  }
  const { seriesId, status } = parsed.data;
  const [current] = await db
    .select()
    .from(series)
    .where(eq(series.id, seriesId))
    .limit(1);
  if (!current) {
    throw new AppError("NOT_FOUND", "Seri tidak ditemukan.");
  }

  // Publish check: if cover media is registered, verify the file exists on disk.
  if (status === "published" && current.coverMediaId) {
    const [cover] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, current.coverMediaId))
      .limit(1);
    if (!cover || !(await mediaFileExists(cover.storageKey))) {
      throw new AppError(
        "CONFLICT",
        "Cover terdaftar tidak ditemukan di penyimpanan media. Unggah ulang cover sebelum menerbitkan.",
      );
    }
  }

  const now = new Date();
  await db
    .update(series)
    .set({
      status,
      archivedAt: status === "archived" ? now : null,
      adminEditedAt: now,
    })
    .where(eq(series.id, seriesId));

  return { id: seriesId, status };
}

export async function uploadSeriesCover(
  actor: SessionUser,
  seriesId: string,
  buffer: Buffer,
): Promise<{ mediaId: string; url: string }> {
  assertAdmin(actor);
  if (!/^[0-9a-f-]{36}$/.test(seriesId)) {
    throw new AppError("VALIDATION_ERROR", "ID seri tidak valid.");
  }

  const [current] = await db
    .select({ id: series.id })
    .from(series)
    .where(eq(series.id, seriesId))
    .limit(1);
  if (!current) {
    throw new AppError("NOT_FOUND", "Seri tidak ditemukan.");
  }

  const stored = await stageAndCommitMediaBuffer({ buffer, kind: "cover" });

  try {
    await db.transaction(async (tx) => {
      await tx.insert(mediaAssets).values({
        id: stored.id,
        kind: "cover",
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        byteSize: stored.byteSize,
        width: stored.width,
        height: stored.height,
        sha256: stored.sha256,
        createdBy: actor.id,
      });

      await tx
        .update(series)
        .set({
          coverMediaId: stored.id,
          adminEditedAt: new Date(),
        })
        .where(eq(series.id, seriesId));
    });
  } catch (err) {
    await removeMediaFile(stored.storageKey);
    throw err;
  }

  return { mediaId: stored.id, url: `/api/media/${stored.id}` };
}

export async function createChapterRecord(
  actor: SessionUser,
  rawInput: unknown,
): Promise<{ id: string; publicId: string; seriesId: string }> {
  assertAdmin(actor);
  const parsed = createChapterSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Data chapter tidak valid.",
      parsed.error.flatten().fieldErrors,
    );
  }
  const input = parsed.data;

  const [parent] = await db
    .select({ id: series.id })
    .from(series)
    .where(eq(series.id, input.seriesId))
    .limit(1);
  if (!parent) {
    throw new AppError("NOT_FOUND", "Seri induk tidak ditemukan.");
  }

  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const [maxRow] = await db
      .select({ maxSort: sql<number>`COALESCE(MAX(${chapters.sortOrder}), 0)` })
      .from(chapters)
      .where(eq(chapters.seriesId, input.seriesId));
    sortOrder = Number(maxRow?.maxSort ?? 0) + 1;
  }

  const id = randomUUID();
  const now = new Date();
  await db.insert(chapters).values({
    id,
    seriesId: input.seriesId,
    publicId: id,
    source: "admin",
    externalId: id,
    chapterNumber: Number(input.chapterNumber).toFixed(2),
    sortOrder,
    title: input.title,
    status: "draft",
    isSynthetic: false,
    adminEditedAt: now,
  });

  return { id, publicId: id, seriesId: input.seriesId };
}

export async function updateChapterRecord(
  actor: SessionUser,
  rawInput: unknown,
): Promise<{ id: string; seriesId: string }> {
  assertAdmin(actor);
  const parsed = updateChapterSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Perubahan chapter tidak valid.",
      parsed.error.flatten().fieldErrors,
    );
  }
  const input = parsed.data;
  const [current] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, input.chapterId))
    .limit(1);
  if (!current) {
    throw new AppError("NOT_FOUND", "Chapter tidak ditemukan.");
  }

  await db
    .update(chapters)
    .set({
      chapterNumber: Number(input.chapterNumber).toFixed(2),
      sortOrder: input.sortOrder,
      title: input.title,
      adminEditedAt: new Date(),
    })
    .where(eq(chapters.id, current.id));

  return { id: current.id, seriesId: current.seriesId };
}

export async function setChapterStatus(
  actor: SessionUser,
  rawInput: unknown,
): Promise<{ id: string; seriesId: string; status: "draft" | "published" | "archived" }> {
  assertAdmin(actor);
  const parsed = chapterStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Status chapter tidak valid.");
  }
  const { chapterId, status } = parsed.data;

  const [current] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!current) {
    throw new AppError("NOT_FOUND", "Chapter tidak ditemukan.");
  }
  if (status === "published" && current.isSynthetic) {
    throw new AppError(
      "CONFLICT",
      "Baris fallback sintetis tidak boleh diterbitkan sebagai chapter asli.",
    );
  }

  // Verify every registered panel file actually exists on disk before publishing!
  if (status === "published") {
    const registeredPanels = await db
      .select({
        panelId: chapterPanels.id,
        storageKey: mediaAssets.storageKey,
      })
      .from(chapterPanels)
      .innerJoin(mediaAssets, eq(chapterPanels.mediaId, mediaAssets.id))
      .where(eq(chapterPanels.chapterId, chapterId));

    for (const p of registeredPanels) {
      if (!(await mediaFileExists(p.storageKey))) {
        throw new AppError(
          "CONFLICT",
          "Ada berkas panel terdaftar yang hilang dari penyimpanan media. Perbaiki panel sebelum menerbitkan.",
        );
      }
    }
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(chapters)
      .set({
        status,
        publishedAt: status === "published" ? now : current.publishedAt,
        adminEditedAt: now,
      })
      .where(eq(chapters.id, chapterId));

    // Recompute latest published chapter number on parent series
    const [latest] = await tx
      .select({ num: chapters.chapterNumber })
      .from(chapters)
      .where(
        and(
          eq(chapters.seriesId, current.seriesId),
          eq(chapters.status, "published"),
          eq(chapters.isSynthetic, false),
        ),
      )
      .orderBy(desc(chapters.sortOrder), desc(chapters.chapterNumber))
      .limit(1);

    await tx
      .update(series)
      .set({
        latestChapterNumber: latest?.num ?? null,
        updatedAt: now,
      })
      .where(eq(series.id, current.seriesId));
  });

  return { id: chapterId, seriesId: current.seriesId, status };
}

export async function uploadChapterPanel(
  actor: SessionUser,
  chapterId: string,
  buffer: Buffer,
): Promise<{ panelId: string; mediaId: string; position: number; url: string }> {
  assertAdmin(actor);
  if (!/^[0-9a-f-]{36}$/.test(chapterId)) {
    throw new AppError("VALIDATION_ERROR", "ID chapter tidak valid.");
  }

  const [ch] = await db
    .select({ id: chapters.id, seriesId: chapters.seriesId })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!ch) {
    throw new AppError("NOT_FOUND", "Chapter tidak ditemukan.");
  }

  const stored = await stageAndCommitMediaBuffer({
    buffer,
    kind: "panel",
    chapterId,
  });

  const panelId = randomUUID();
  let position = 1;

  try {
    await db.transaction(async (tx) => {
      const [maxRow] = await tx
        .select({
          maxPos: sql<number>`COALESCE(MAX(${chapterPanels.position}), 0)`,
        })
        .from(chapterPanels)
        .where(eq(chapterPanels.chapterId, chapterId));
      position = Number(maxRow?.maxPos ?? 0) + 1;

      await tx.insert(mediaAssets).values({
        id: stored.id,
        kind: "panel",
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        byteSize: stored.byteSize,
        width: stored.width,
        height: stored.height,
        sha256: stored.sha256,
        createdBy: actor.id,
      });

      await tx.insert(chapterPanels).values({
        id: panelId,
        chapterId,
        mediaId: stored.id,
        position,
      });

      await tx
        .update(chapters)
        .set({ adminEditedAt: new Date() })
        .where(eq(chapters.id, chapterId));
    });
  } catch (err) {
    await removeMediaFile(stored.storageKey);
    throw err;
  }

  return {
    panelId,
    mediaId: stored.id,
    position,
    url: `/api/media/${stored.id}`,
  };
}

export async function reorderChapterPanels(
  actor: SessionUser,
  rawInput: unknown,
): Promise<{ chapterId: string; orderedIds: string[] }> {
  assertAdmin(actor);
  const parsed = reorderPanelsSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Daftar urutan panel tidak valid.");
  }
  const { chapterId, panelIds } = parsed.data;
  const uniqueIds = new Set(panelIds);
  if (uniqueIds.size !== panelIds.length) {
    throw new AppError("VALIDATION_ERROR", "Terdapat ID panel ganda.");
  }

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: chapterPanels.id })
      .from(chapterPanels)
      .where(eq(chapterPanels.chapterId, chapterId));

    if (existing.length !== panelIds.length) {
      throw new AppError(
        "CONFLICT",
        "Jumlah panel berubah. Muat ulang halaman lalu coba lagi.",
      );
    }

    const existingSet = new Set(existing.map((e) => e.id));
    for (const id of panelIds) {
      if (!existingSet.has(id)) {
        throw new AppError("VALIDATION_ERROR", "Panel bukan milik chapter ini.");
      }
    }

    // Two-phase positional update inside a single transaction to satisfy UNIQUE(chapter_id, position) in MySQL.
    for (let i = 0; i < panelIds.length; i++) {
      await tx
        .update(chapterPanels)
        .set({ position: -(i + 1) })
        .where(
          and(
            eq(chapterPanels.id, panelIds[i]),
            eq(chapterPanels.chapterId, chapterId),
          ),
        );
    }

    for (let i = 0; i < panelIds.length; i++) {
      await tx
        .update(chapterPanels)
        .set({ position: i + 1 })
        .where(
          and(
            eq(chapterPanels.id, panelIds[i]),
            eq(chapterPanels.chapterId, chapterId),
          ),
        );
    }

    await tx
      .update(chapters)
      .set({ adminEditedAt: new Date() })
      .where(eq(chapters.id, chapterId));
  });

  return { chapterId, orderedIds: panelIds };
}

export async function deleteChapterPanel(
  actor: SessionUser,
  chapterId: string,
  panelId: string,
): Promise<{ chapterId: string }> {
  assertAdmin(actor);
  if (!/^[0-9a-f-]{36}$/.test(chapterId) || !/^[0-9a-f-]{36}$/.test(panelId)) {
    throw new AppError("VALIDATION_ERROR", "ID panel atau chapter tidak valid.");
  }

  let removedStorageKey: string | null = null;
  let removedMediaId: string | null = null;

  await db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: chapterPanels.id,
        mediaId: chapterPanels.mediaId,
        storageKey: mediaAssets.storageKey,
      })
      .from(chapterPanels)
      .innerJoin(mediaAssets, eq(chapterPanels.mediaId, mediaAssets.id))
      .where(
        and(
          eq(chapterPanels.id, panelId),
          eq(chapterPanels.chapterId, chapterId),
        ),
      )
      .limit(1);

    if (!target) {
      throw new AppError("NOT_FOUND", "Panel tidak ditemukan.");
    }

    await tx
      .delete(chapterPanels)
      .where(
        and(
          eq(chapterPanels.id, panelId),
          eq(chapterPanels.chapterId, chapterId),
        ),
      );

    // Compact remaining panel positions sequentially
    const remaining = await tx
      .select({ id: chapterPanels.id })
      .from(chapterPanels)
      .where(eq(chapterPanels.chapterId, chapterId))
      .orderBy(asc(chapterPanels.position));

    for (let i = 0; i < remaining.length; i++) {
      await tx
        .update(chapterPanels)
        .set({ position: -(i + 1) })
        .where(eq(chapterPanels.id, remaining[i].id));
    }
    for (let i = 0; i < remaining.length; i++) {
      await tx
        .update(chapterPanels)
        .set({ position: i + 1 })
        .where(eq(chapterPanels.id, remaining[i].id));
    }

    // Check if media asset is still referenced anywhere else before removing
    const [stillUsed] = await tx
      .select({ id: chapterPanels.id })
      .from(chapterPanels)
      .where(eq(chapterPanels.mediaId, target.mediaId))
      .limit(1);

    if (!stillUsed) {
      await tx.delete(mediaAssets).where(eq(mediaAssets.id, target.mediaId));
      removedStorageKey = target.storageKey;
      removedMediaId = target.mediaId;
    }

    await tx
      .update(chapters)
      .set({ adminEditedAt: new Date() })
      .where(eq(chapters.id, chapterId));
  });

  if (removedStorageKey && removedMediaId) {
    await removeMediaFile(removedStorageKey);
  }

  return { chapterId };
}
