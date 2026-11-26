import {
  mysqlTable,
  char,
  varchar,
  text,
  int,
  boolean,
  timestamp,
  mysqlEnum,
  index,
} from "drizzle-orm/mysql-core";
import { user } from "./auth";
import { mediaAssets } from "./catalog";

export const adCampaigns = mysqlTable(
  "ad_campaigns",
  {
    id: char("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slot: mysqlEnum("slot", [
      "home_top",
      "catalog_top",
      "series_mid",
      "reader_top",
      "reader_bottom",
      "reader_interstitial",
    ]).notNull(),
    adType: mysqlEnum("ad_type", ["banner", "network"])
      .notNull()
      .default("banner"),
    status: mysqlEnum("status", ["draft", "active", "paused"])
      .notNull()
      .default("draft"),
    priority: int("priority").notNull().default(10),
    hideForAdmin: boolean("hide_for_admin").notNull().default(false),
    desktopMediaId: char("desktop_media_id", { length: 36 }).references(
      () => mediaAssets.id,
      { onDelete: "set null" },
    ),
    mobileMediaId: char("mobile_media_id", { length: 36 }).references(
      () => mediaAssets.id,
      { onDelete: "set null" },
    ),
    imageAlt: varchar("image_alt", { length: 200 }).notNull().default(""),
    targetUrl: varchar("target_url", { length: 512 }),
    openInNewTab: boolean("open_in_new_tab").notNull().default(true),
    networkCode: text("network_code"),
    frameHeightDesktop: int("frame_height_desktop").notNull().default(100),
    frameHeightMobile: int("frame_height_mobile").notNull().default(100),
    cooldownMinutes: int("cooldown_minutes").notNull().default(5),
    closeDelaySeconds: int("close_delay_seconds").notNull().default(3),
    startsAt: timestamp("starts_at", { fsp: 3 }),
    endsAt: timestamp("ends_at", { fsp: 3 }),
    impressions: int("impressions", { unsigned: true }).notNull().default(0),
    clicks: int("clicks", { unsigned: true }).notNull().default(0),
    createdBy: varchar("created_by", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("ad_campaigns_slot_status_idx").on(
      table.slot,
      table.status,
      table.priority,
    ),
    index("ad_campaigns_desktop_media_idx").on(table.desktopMediaId),
    index("ad_campaigns_mobile_media_idx").on(table.mobileMediaId),
  ],
);
