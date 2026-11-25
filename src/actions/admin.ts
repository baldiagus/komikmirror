"use server";

import { revalidatePath } from "next/cache";
import {
  createChapterRecord,
  createSeriesRecord,
  deleteChapterPanel,
  reorderChapterPanels,
  setChapterStatus,
  setSeriesStatus,
  updateChapterRecord,
  updateSeriesRecord,
  uploadChapterPanel,
  uploadSeriesCover,
} from "@/dal/admin";
import { AppError, toActionError, type ActionResult } from "@/lib/errors";
import { requireAdmin } from "@/lib/session";

export async function createSeriesAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; slug: string; publicId: string }>> {
  try {
    const admin = await requireAdmin();
    const result = await createSeriesRecord(admin, {
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? "") || undefined,
      type: String(formData.get("type") ?? "Manhwa"),
      genre: String(formData.get("genre") ?? "Action"),
      publicationStatus: String(formData.get("publicationStatus") ?? "Ongoing"),
      rating: String(formData.get("rating") ?? "0.0") || "0.0",
      rank: formData.get("rank") ?? 0,
      followers: formData.get("followers") ?? 0,
      summary: String(formData.get("summary") ?? ""),
    });
    revalidatePath("/admin/series");
    return { ok: true, data: result, message: "Seri draft berhasil dibuat." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateSeriesAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const admin = await requireAdmin();
    const result = await updateSeriesRecord(admin, {
      seriesId: String(formData.get("seriesId") ?? ""),
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? "") || undefined,
      type: String(formData.get("type") ?? "Manhwa"),
      genre: String(formData.get("genre") ?? "Action"),
      publicationStatus: String(formData.get("publicationStatus") ?? "Ongoing"),
      rating: String(formData.get("rating") ?? "0.0") || "0.0",
      rank: formData.get("rank") ?? 0,
      followers: formData.get("followers") ?? 0,
      summary: String(formData.get("summary") ?? ""),
    });
    revalidatePath("/");
    revalidatePath("/series");
    revalidatePath(`/admin/series`);
    revalidatePath(`/admin/series/${result.id}`);
    return { ok: true, data: result, message: "Perubahan seri tersimpan." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setSeriesStatusAction(
  seriesId: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult<{ id: string; status: "draft" | "published" | "archived" }>> {
  try {
    const admin = await requireAdmin();
    const result = await setSeriesStatus(admin, { seriesId, status });
    revalidatePath("/");
    revalidatePath("/series");
    revalidatePath("/admin/series");
    revalidatePath(`/admin/series/${seriesId}`);
    const label =
      status === "published"
        ? "Seri diterbitkan."
        : status === "archived"
          ? "Seri diarsipkan."
          : "Seri dikembalikan ke draft.";
    return { ok: true, data: result, message: label };
  } catch (err) {
    return toActionError(err);
  }
}

export async function uploadSeriesCoverAction(
  formData: FormData,
): Promise<ActionResult<{ mediaId: string; url: string }>> {
  try {
    const admin = await requireAdmin();
    const seriesId = String(formData.get("seriesId") ?? "");
    const file = formData.get("cover");
    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("VALIDATION_ERROR", "Pilih berkas cover terlebih dahulu.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadSeriesCover(admin, seriesId, buffer);
    revalidatePath("/");
    revalidatePath("/series");
    revalidatePath(`/admin/series/${seriesId}`);
    return { ok: true, data: result, message: "Cover berhasil diunggah." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createChapterAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; publicId: string; seriesId: string }>> {
  try {
    const admin = await requireAdmin();
    const sortRaw = String(formData.get("sortOrder") ?? "").trim();
    const result = await createChapterRecord(admin, {
      seriesId: String(formData.get("seriesId") ?? ""),
      chapterNumber: String(formData.get("chapterNumber") ?? ""),
      title: String(formData.get("title") ?? ""),
      sortOrder: sortRaw === "" ? undefined : Number(sortRaw),
    });
    revalidatePath(`/admin/series/${result.seriesId}`);
    return { ok: true, data: result, message: "Chapter draft berhasil dibuat." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateChapterAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; seriesId: string }>> {
  try {
    const admin = await requireAdmin();
    const result = await updateChapterRecord(admin, {
      chapterId: String(formData.get("chapterId") ?? ""),
      chapterNumber: String(formData.get("chapterNumber") ?? ""),
      title: String(formData.get("title") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    });
    revalidatePath(`/admin/series/${result.seriesId}`);
    revalidatePath(`/admin/series/${result.seriesId}/chapters/${result.id}`);
    return { ok: true, data: result, message: "Metadata chapter tersimpan." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setChapterStatusAction(
  chapterId: string,
  status: "draft" | "published" | "archived",
): Promise<
  ActionResult<{
    id: string;
    seriesId: string;
    status: "draft" | "published" | "archived";
  }>
> {
  try {
    const admin = await requireAdmin();
    const result = await setChapterStatus(admin, { chapterId, status });
    revalidatePath("/");
    revalidatePath("/series");
    revalidatePath(`/admin/series/${result.seriesId}`);
    revalidatePath(`/admin/series/${result.seriesId}/chapters/${chapterId}`);
    return {
      ok: true,
      data: result,
      message:
        status === "published"
          ? "Chapter diterbitkan."
          : status === "archived"
            ? "Chapter diarsipkan."
            : "Chapter dikembalikan ke draft.",
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function uploadChapterPanelsAction(
  formData: FormData,
): Promise<
  ActionResult<{ uploaded: { panelId: string; mediaId: string; position: number; url: string }[] }>
> {
  try {
    const admin = await requireAdmin();
    const chapterId = String(formData.get("chapterId") ?? "");
    const seriesId = String(formData.get("seriesId") ?? "");
    const entries = formData.getAll("panels").filter((x): x is File => x instanceof File && x.size > 0);
    if (entries.length === 0) {
      throw new AppError("VALIDATION_ERROR", "Pilih minimal satu berkas panel gambar.");
    }
    const uploaded = [];
    for (const file of entries) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const panel = await uploadChapterPanel(admin, chapterId, buffer);
      uploaded.push(panel);
    }
    if (seriesId) {
      revalidatePath(`/admin/series/${seriesId}/chapters/${chapterId}`);
      revalidatePath(`/admin/series/${seriesId}`);
    }
    return {
      ok: true,
      data: { uploaded },
      message: `${uploaded.length} panel berhasil diunggah.`,
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function reorderPanelsAction(
  seriesId: string,
  chapterId: string,
  panelIds: string[],
): Promise<ActionResult<{ chapterId: string; orderedIds: string[] }>> {
  try {
    const admin = await requireAdmin();
    const result = await reorderChapterPanels(admin, { chapterId, panelIds });
    revalidatePath(`/admin/series/${seriesId}/chapters/${chapterId}`);
    return { ok: true, data: result, message: "Urutan panel diperbarui." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deletePanelAction(
  seriesId: string,
  chapterId: string,
  panelId: string,
): Promise<ActionResult<{ chapterId: string }>> {
  try {
    const admin = await requireAdmin();
    const result = await deleteChapterPanel(admin, chapterId, panelId);
    revalidatePath(`/admin/series/${seriesId}/chapters/${chapterId}`);
    revalidatePath(`/admin/series/${seriesId}`);
    return { ok: true, data: result, message: "Panel dihapus." };
  } catch (err) {
    return toActionError(err);
  }
}
