import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  account,
  chapters,
  series,
  user,
  userBookmarks,
  userHistory,
  userQueue,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { formatDateShort } from "@/lib/slug";

export interface UserAccountOverviewDTO {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  providers: string[];
  hasPassword: boolean;
  hasGoogle: boolean;
  libraryCounts: {
    bookmarks: number;
    queue: number;
    history: number;
  };
}

export async function getUserAccountOverview(
  userId: string,
): Promise<UserAccountOverviewDTO | null> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) return null;

  const [accounts, [bmCount], [qCount], [hCount]] = await Promise.all([
    db
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, userId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(userBookmarks)
      .where(eq(userBookmarks.userId, userId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(userQueue)
      .where(eq(userQueue.userId, userId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(userHistory)
      .where(eq(userHistory.userId, userId)),
  ]);

  const providers = Array.from(new Set(accounts.map((a) => a.providerId)));

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role === "admin" ? "admin" : "user",
    emailVerified: Boolean(row.emailVerified),
    image: row.image ?? null,
    createdAt: formatDateShort(row.createdAt),
    providers,
    hasPassword: providers.includes("credential"),
    hasGoogle: providers.includes("google"),
    libraryCounts: {
      bookmarks: Number(bmCount?.count ?? 0),
      queue: Number(qCount?.count ?? 0),
      history: Number(hCount?.count ?? 0),
    },
  };
}

export async function updateOwnDisplayName(
  userId: string,
  rawName: string,
): Promise<{ name: string }> {
  const name = rawName.trim();
  if (name.length < 1 || name.length > 80) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Nama tampilan harus terdiri dari 1 sampai 80 karakter.",
    );
  }

  await db.update(user).set({ name }).where(eq(user.id, userId));
  return { name };
}

export async function exportUserLibrarySnapshot(userId: string): Promise<{
  version: "shinigami-lab-v1";
  exportedAt: string;
  bookmarks: string[];
  queue: string[];
  history: string[];
}> {
  const [bmRows, qRows, hRows] = await Promise.all([
    db
      .select({ publicId: series.publicId })
      .from(userBookmarks)
      .innerJoin(series, eq(userBookmarks.seriesId, series.id))
      .where(
        and(eq(userBookmarks.userId, userId), eq(series.status, "published")),
      )
      .orderBy(desc(userBookmarks.createdAt)),
    db
      .select({ publicId: series.publicId })
      .from(userQueue)
      .innerJoin(series, eq(userQueue.seriesId, series.id))
      .where(and(eq(userQueue.userId, userId), eq(series.status, "published")))
      .orderBy(asc(userQueue.position), desc(userQueue.createdAt)),
    db
      .select({ publicId: chapters.publicId })
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
      .limit(1000),
  ]);

  return {
    version: "shinigami-lab-v1",
    exportedAt: new Date().toISOString(),
    bookmarks: bmRows.map((r) => r.publicId),
    queue: qRows.map((r) => r.publicId),
    history: hRows.map((r) => r.publicId),
  };
}
