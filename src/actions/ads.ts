"use server";

import { revalidatePath } from "next/cache";
import {
  createAdminAd,
  deleteAdminAd,
  resetAdminAdStats,
  setAdminAdStatus,
  updateAdminAd,
} from "@/dal/ads";
import { toActionError, type ActionResult } from "@/lib/errors";
import { requireAdmin } from "@/lib/session";
import type { AdStatus } from "@/lib/validation";

function revalidateAdPaths() {
  revalidatePath("/");
  revalidatePath("/series");
  revalidatePath("/admin/ads");
}

async function readOptionalFileBuffer(
  formData: FormData,
  field: string,
): Promise<Buffer | null> {
  const entry = formData.get(field);
  if (!(entry instanceof File) || entry.size === 0) return null;
  return Buffer.from(await entry.arrayBuffer());
}

function parseAdFormPayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    slot: String(formData.get("slot") ?? "home_top"),
    adType: String(formData.get("adType") ?? "banner"),
    status: String(formData.get("status") ?? "draft"),
    priority: formData.get("priority") ?? 10,
    hideForAdmin: formData.get("hideForAdmin") === "on",
    imageAlt: String(formData.get("imageAlt") ?? ""),
    targetUrl: String(formData.get("targetUrl") ?? ""),
    openInNewTab: formData.get("openInNewTab") === "on",
    networkCode: String(formData.get("networkCode") ?? ""),
    frameHeightDesktop: formData.get("frameHeightDesktop") ?? 100,
    frameHeightMobile: formData.get("frameHeightMobile") ?? 100,
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
  };
}

export async function createAdAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; status: AdStatus }>> {
  try {
    const admin = await requireAdmin();
    const [desktopBuffer, mobileBuffer] = await Promise.all([
      readOptionalFileBuffer(formData, "desktopImage"),
      readOptionalFileBuffer(formData, "mobileImage"),
    ]);
    const result = await createAdminAd(admin, parseAdFormPayload(formData), {
      desktopBuffer,
      mobileBuffer,
    });
    revalidateAdPaths();
    return {
      ok: true,
      data: result,
      message: "Kampanye iklan berhasil dibuat.",
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateAdAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdmin();
    const [desktopBuffer, mobileBuffer] = await Promise.all([
      readOptionalFileBuffer(formData, "desktopImage"),
      readOptionalFileBuffer(formData, "mobileImage"),
    ]);
    const result = await updateAdminAd(
      admin,
      {
        adId: String(formData.get("adId") ?? ""),
        ...parseAdFormPayload(formData),
      },
      { desktopBuffer, mobileBuffer },
    );
    revalidateAdPaths();
    return {
      ok: true,
      data: result,
      message: "Kampanye iklan berhasil diperbarui.",
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setAdStatusAction(
  adId: string,
  status: AdStatus,
): Promise<ActionResult<{ id: string; status: AdStatus }>> {
  try {
    const admin = await requireAdmin();
    const result = await setAdminAdStatus(admin, { adId, status });
    revalidateAdPaths();
    const label =
      status === "active"
        ? "Iklan diaktifkan."
        : status === "paused"
          ? "Iklan dijeda."
          : "Iklan dikembalikan ke draft.";
    return { ok: true, data: result, message: label };
  } catch (err) {
    return toActionError(err);
  }
}

export async function resetAdStatsAction(
  adId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdmin();
    const result = await resetAdminAdStats(admin, adId);
    revalidatePath("/admin/ads");
    return {
      ok: true,
      data: result,
      message: "Statistik tayangan dan klik direset ke 0.",
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteAdAction(
  adId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdmin();
    const result = await deleteAdminAd(admin, adId);
    revalidateAdPaths();
    return {
      ok: true,
      data: result,
      message: "Kampanye iklan dihapus.",
    };
  } catch (err) {
    return toActionError(err);
  }
}
