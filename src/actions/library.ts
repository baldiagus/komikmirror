"use server";

import { revalidatePath } from "next/cache";
import {
  clearUserHistory,
  importBrowserLibraryForUser,
  toggleUserBookmark,
  toggleUserQueue,
} from "@/dal/library";
import { toActionError, type ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/session";

export async function toggleBookmarkAction(
  seriesId: string,
): Promise<ActionResult<{ bookmarked: boolean }>> {
  try {
    const user = await requireUser();
    const result = await toggleUserBookmark(user.id, seriesId);
    revalidatePath("/library");
    return {
      ok: true,
      data: result,
      message: result.bookmarked
        ? "Ditambahkan ke bookmark."
        : "Dihapus dari bookmark.",
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function toggleQueueAction(
  seriesId: string,
): Promise<ActionResult<{ queued: boolean }>> {
  try {
    const user = await requireUser();
    const result = await toggleUserQueue(user.id, seriesId);
    revalidatePath("/library");
    return {
      ok: true,
      data: result,
      message: result.queued
        ? "Ditambahkan ke antrean."
        : "Dihapus dari antrean.",
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function clearHistoryAction(): Promise<ActionResult<{ cleared: true }>> {
  try {
    const user = await requireUser();
    await clearUserHistory(user.id);
    revalidatePath("/library");
    return {
      ok: true,
      data: { cleared: true },
      message: "Riwayat baca akun Anda telah dihapus.",
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function importBrowserLibraryAction(payload: {
  bookmarks: string[];
  queue: string[];
  history: string[];
}): Promise<
  ActionResult<{
    bookmarksImported: number;
    queueImported: number;
    historyImported: number;
    unmappedCount: number;
  }>
> {
  try {
    const user = await requireUser();
    const summary = await importBrowserLibraryForUser(user.id, payload);
    revalidatePath("/library");
    return {
      ok: true,
      data: summary,
      message: `Impor selesai: ${summary.bookmarksImported} bookmark, ${summary.queueImported} antrean, ${summary.historyImported} riwayat.`,
    };
  } catch (err) {
    return toActionError(err);
  }
}
