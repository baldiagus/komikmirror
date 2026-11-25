import {
  mysqlTable,
  char,
  varchar,
  int,
  tinyint,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { user } from "./auth";
import { series, chapters } from "./catalog";

export const userBookmarks = mysqlTable(
  "user_bookmarks",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    seriesId: char("series_id", { length: 36 })
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.seriesId] }),
    index("user_bookmarks_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const userQueue = mysqlTable(
  "user_queue",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    seriesId: char("series_id", { length: 36 })
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    position: int("position").notNull().default(0),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.seriesId] }),
    index("user_queue_user_pos_idx").on(table.userId, table.position),
  ],
);

export const userHistory = mysqlTable(
  "user_history",
  {
    id: char("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    seriesId: char("series_id", { length: 36 })
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    chapterId: char("chapter_id", { length: 36 })
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    progressPercent: tinyint("progress_percent", { unsigned: true })
      .notNull()
      .default(100),
    readAt: timestamp("read_at", { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_history_user_chapter_uq").on(
      table.userId,
      table.chapterId,
    ),
    index("user_history_user_read_idx").on(table.userId, table.readAt),
    index("user_history_user_series_idx").on(table.userId, table.seriesId),
  ],
);
