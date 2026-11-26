import { z } from "zod";

export const SERIES_TYPES = ["Manhwa", "Manhua", "Manga"] as const;
export const PUBLICATION_STATUSES = ["Ongoing", "Completed", "Hiatus"] as const;
export const WORKFLOW_STATUSES = ["draft", "published", "archived"] as const;

export const AD_SLOTS = [
  "home_top",
  "catalog_top",
  "series_mid",
  "reader_top",
  "reader_bottom",
] as const;
export type AdSlotKey = (typeof AD_SLOTS)[number];

export const AD_SLOT_META: Record<
  AdSlotKey,
  { label: string; description: string }
> = {
  home_top: {
    label: "Beranda (Atas)",
    description: "Tampil di bawah Hero & Peringkat sebelum Komik Terbaru.",
  },
  catalog_top: {
    label: "Daftar Komik (Atas)",
    description: "Banner tipis di atas grid hasil halaman Daftar Komik.",
  },
  series_mid: {
    label: "Detail Komik (Tengah)",
    description: "Tampil di antara sinopsis komik dan daftar chapter.",
  },
  reader_top: {
    label: "Pembaca (Atas Panel)",
    description: "Tampil tepat di atas panel pertama saat membaca chapter.",
  },
  reader_bottom: {
    label: "Pembaca (Bawah Panel)",
    description: "Tampil tepat di bawah panel terakhir sebelum navigasi chapter.",
  },
};

export const AD_TYPES = ["banner", "network"] as const;
export type AdType = (typeof AD_TYPES)[number];

export const AD_STATUSES = ["draft", "active", "paused"] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

export const ALL_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Historical",
  "Horror",
  "Isekai",
  "Magic",
  "Martial Arts",
  "Murim",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-fi",
  "Slice of Life",
  "Supernatural",
  "Thriller",
  "Wuxia",
] as const;

const decimalNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{1,8}(\.\d{1,2})?$/, "Nomor chapter harus berupa angka valid (contoh: 12 atau 12.5).");

const ratingSchema = z
  .string()
  .trim()
  .regex(/^(10(\.0)?|[0-9](\.\d)?)$/, "Rating harus antara 0.0 sampai 10.0.")
  .default("0.0");

export const createSeriesSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi.").max(255),
  slug: z
    .string()
    .trim()
    .max(160)
    .regex(/^[a-z0-9-]*$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung.")
    .optional(),
  type: z.enum(SERIES_TYPES),
  genre: z.string().trim().min(1, "Genre wajib diisi.").max(80),
  publicationStatus: z.enum(PUBLICATION_STATUSES).default("Ongoing"),
  rating: ratingSchema.optional().default("0.0"),
  rank: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
  followers: z.coerce.number().int().min(0).max(100_000_000).optional().default(0),
  summary: z.string().trim().max(5000).default(""),
});

export const updateSeriesSchema = createSeriesSchema.extend({
  seriesId: z.string().uuid("ID seri tidak valid."),
});

export const seriesStatusSchema = z.object({
  seriesId: z.string().uuid("ID seri tidak valid."),
  status: z.enum(WORKFLOW_STATUSES),
});

export const createChapterSchema = z.object({
  seriesId: z.string().uuid("ID seri tidak valid."),
  chapterNumber: decimalNumberSchema,
  title: z.string().trim().max(255).default(""),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

export const updateChapterSchema = z.object({
  chapterId: z.string().uuid("ID chapter tidak valid."),
  chapterNumber: decimalNumberSchema,
  title: z.string().trim().max(255).default(""),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000),
});

export const chapterStatusSchema = z.object({
  chapterId: z.string().uuid("ID chapter tidak valid."),
  status: z.enum(WORKFLOW_STATUSES),
});

export const reorderPanelsSchema = z.object({
  chapterId: z.string().uuid("ID chapter tidak valid."),
  panelIds: z
    .array(z.string().uuid("ID panel tidak valid."))
    .min(1, "Minimal satu panel untuk diurutkan.")
    .max(500),
});

export const catalogFilterSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  type: z.enum(["", ...SERIES_TYPES]).optional().default(""),
  genre: z.string().trim().max(80).optional().default(""),
  status: z.enum(["", ...PUBLICATION_STATUSES]).optional().default(""),
  sort: z.enum(["", "popular", "rating", "name"]).optional().default(""),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});

export const browserLibraryImportSchema = z.object({
  bookmarks: z.array(z.string().trim().min(1).max(120)).max(500).default([]),
  queue: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  history: z.array(z.string().trim().min(1).max(120)).max(1000).default([]),
});

export const adminUserRoleSchema = z.object({
  userId: z.string().trim().min(1, "ID pengguna tidak valid.").max(36),
  role: z.enum(["admin", "user"]),
});

export const adminUserBanSchema = z.object({
  userId: z.string().trim().min(1, "ID pengguna tidak valid.").max(36),
  banned: z.boolean(),
  reason: z.string().trim().max(240).optional().default(""),
});

const safeHttpUrlSchema = z
  .string()
  .trim()
  .max(512, "URL tujuan maksimal 512 karakter.")
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const u = new URL(val);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    },
    "URL tujuan harus menggunakan protokol http:// atau https:// yang valid.",
  );

const optionalDatetimeSchema = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine(
    (val) => !val || !Number.isNaN(Date.parse(val)),
    "Format tanggal jadwal tidak valid.",
  );

const adBaseSchema = z.object({
  name: z.string().trim().min(1, "Nama kampanye wajib diisi.").max(160),
  slot: z.enum(AD_SLOTS),
  adType: z.enum(AD_TYPES),
  status: z.enum(AD_STATUSES).optional().default("draft"),
  priority: z.coerce.number().int().min(0).max(1000).optional().default(10),
  hideForAdmin: z.boolean().optional().default(false),
  imageAlt: z.string().trim().max(200).optional().default(""),
  targetUrl: safeHttpUrlSchema.optional().default(""),
  openInNewTab: z.boolean().optional().default(true),
  networkCode: z
    .string()
    .trim()
    .max(16_000, "Kode ad network maksimal 16.000 karakter.")
    .optional()
    .default(""),
  frameHeightDesktop: z.coerce
    .number()
    .int()
    .min(50, "Tinggi frame minimal 50px.")
    .max(600, "Tinggi frame maksimal 600px.")
    .optional()
    .default(100),
  frameHeightMobile: z.coerce
    .number()
    .int()
    .min(50, "Tinggi frame minimal 50px.")
    .max(600, "Tinggi frame maksimal 600px.")
    .optional()
    .default(100),
  startsAt: optionalDatetimeSchema,
  endsAt: optionalDatetimeSchema,
});

function validateAdDates(
  val: { startsAt: string; endsAt: string },
  ctx: z.RefinementCtx,
) {
  if (val.startsAt && val.endsAt) {
    const startMs = Date.parse(val.startsAt);
    const endMs = Date.parse(val.endsAt);
    if (endMs <= startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "Waktu selesai harus setelah waktu mulai.",
      });
    }
  }
}

export const createAdSchema = adBaseSchema.superRefine(validateAdDates);

export const updateAdSchema = adBaseSchema
  .extend({
    adId: z.string().uuid("ID kampanye iklan tidak valid."),
  })
  .superRefine(validateAdDates);

export const adStatusSchema = z.object({
  adId: z.string().uuid("ID kampanye iklan tidak valid."),
  status: z.enum(AD_STATUSES),
});

export const snapshotChapterSchema = z.object({
  id: z.string().trim().min(1).max(120),
  number: z.union([z.number(), z.string()]).transform((val) => {
    const num = Number(val);
    if (!Number.isFinite(num) || num < 0) {
      throw new Error("Invalid chapter number");
    }
    // Preserve up to 2 decimal places cleanly (e.g. 364.1 -> "364.10" or "364.1")
    return Number.isInteger(num) ? num.toFixed(2) : num.toFixed(2);
  }),
  title: z.string().optional().default(""),
});

export const snapshotSeriesSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(255),
  type: z.enum(SERIES_TYPES).catch("Manhwa"),
  genre: z.string().trim().min(1).max(80).catch("Action"),
  status: z.enum(PUBLICATION_STATUSES).catch("Ongoing"),
  rank: z.coerce.number().int().min(0).catch(0),
  followers: z.coerce.number().int().min(0).catch(0),
  updated: z.string().trim().max(64).optional().default(""),
  rating: z.coerce
    .number()
    .min(0)
    .max(10)
    .catch(0)
    .transform((n) => n.toFixed(1)),
  summary: z.string().optional().default(""),
  latestChapterNumber: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      const num = Number(val);
      return Number.isFinite(num) ? num.toFixed(2) : null;
    }),
  coverUrl: z.string().trim().max(512).optional().default(""),
  chapters: z.array(snapshotChapterSchema).optional().default([]),
});
