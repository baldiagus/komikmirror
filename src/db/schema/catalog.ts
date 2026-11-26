import {
  mysqlTable,
  char,
  varchar,
  text,
  int,
  decimal,
  boolean,
  timestamp,
  mysqlEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { user } from "./auth";

export const mediaAssets = mysqlTable(
  "media_assets",
  {
    id: char("id", { length: 36 }).primaryKey(),
    kind: mysqlEnum("kind", ["cover", "panel", "ad"]).notNull(),
    storageKey: varchar("storage_key", { length: 255 }).notNull().unique(),
    mimeType: varchar("mime_type", { length: 64 }).notNull(),
    byteSize: int("byte_size", { unsigned: true }).notNull(),
    width: int("width", { unsigned: true }).notNull(),
    height: int("height", { unsigned: true }).notNull(),
    sha256: char("sha256", { length: 64 }).notNull(),
    createdBy: varchar("created_by", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [index("media_assets_kind_idx").on(table.kind)],
);

export const series = mysqlTable(
  "series",
  {
    id: char("id", { length: 36 }).primaryKey(),
    publicId: varchar("public_id", { length: 120 }).notNull().unique(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    source: varchar("source", { length: 64 }),
    externalId: varchar("external_id", { length: 120 }),
    title: varchar("title", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["Manhwa", "Manhua", "Manga"])
      .notNull()
      .default("Manhwa"),
    genre: varchar("genre", { length: 80 }).notNull().default("Action"),
    publicationStatus: mysqlEnum("publication_status", [
      "Ongoing",
      "Completed",
      "Hiatus",
    ])
      .notNull()
      .default("Ongoing"),
    status: mysqlEnum("status", ["draft", "published", "archived"])
      .notNull()
      .default("draft"),
    rank: int("rank").notNull().default(0),
    followers: int("followers").notNull().default(0),
    rating: decimal("rating", { precision: 3, scale: 1 })
      .notNull()
      .default("0.0"),
    summary: text("summary").notNull(),
    updatedLabel: varchar("updated_label", { length: 64 }),
    latestChapterNumber: decimal("latest_chapter_number", {
      precision: 10,
      scale: 2,
    }),
    coverMediaId: char("cover_media_id", { length: 36 }).references(
      () => mediaAssets.id,
      { onDelete: "set null" },
    ),
    externalCoverUrl: varchar("external_cover_url", { length: 512 }),
    adminEditedAt: timestamp("admin_edited_at", { fsp: 3 }),
    archivedAt: timestamp("archived_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("series_source_external_uq").on(table.source, table.externalId),
    index("series_status_updated_idx").on(table.status, table.updatedAt),
    index("series_status_type_idx").on(table.status, table.type),
    index("series_status_genre_idx").on(table.status, table.genre),
    index("series_status_rating_idx").on(table.status, table.rating),
    index("series_cover_media_idx").on(table.coverMediaId),
  ],
);

export const chapters = mysqlTable(
  "chapters",
  {
    id: char("id", { length: 36 }).primaryKey(),
    seriesId: char("series_id", { length: 36 })
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    publicId: varchar("public_id", { length: 120 }).notNull().unique(),
    source: varchar("source", { length: 64 }),
    externalId: varchar("external_id", { length: 120 }),
    chapterNumber: decimal("chapter_number", {
      precision: 10,
      scale: 2,
    }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    title: varchar("title", { length: 255 }).notNull().default(""),
    status: mysqlEnum("status", ["draft", "published", "archived"])
      .notNull()
      .default("draft"),
    isSynthetic: boolean("is_synthetic").notNull().default(false),
    adminEditedAt: timestamp("admin_edited_at", { fsp: 3 }),
    publishedAt: timestamp("published_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("chapters_source_external_uq").on(
      table.source,
      table.externalId,
    ),
    index("chapters_series_status_order_idx").on(
      table.seriesId,
      table.status,
      table.sortOrder,
      table.chapterNumber,
    ),
  ],
);

export const chapterPanels = mysqlTable(
  "chapter_panels",
  {
    id: char("id", { length: 36 }).primaryKey(),
    chapterId: char("chapter_id", { length: 36 })
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    mediaId: char("media_id", { length: 36 })
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    position: int("position").notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("chapter_panels_chapter_pos_uq").on(
      table.chapterId,
      table.position,
    ),
    index("chapter_panels_media_idx").on(table.mediaId),
  ],
);
