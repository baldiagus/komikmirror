import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { adCampaigns, mediaAssets } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { removeMediaFile, stageAndCommitMediaBuffer } from "@/lib/media";
import type { SessionUser } from "@/lib/session";
import { formatDateShort } from "@/lib/slug";
import {
  adStatusSchema,
  createAdSchema,
  updateAdSchema,
  type AdSlotKey,
  type AdStatus,
  type AdType,
} from "@/lib/validation";

export interface PublicAdDTO {
  id: string;
  slot: AdSlotKey;
  adType: AdType;
  name: string;
  imageAlt: string;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
  clickUrl: string;
  openInNewTab: boolean;
  networkCode: string | null;
  frameHeightDesktop: number;
  frameHeightMobile: number;
  cooldownMinutes: number;
  closeDelaySeconds: number;
}

export interface AdminAdItemDTO {
  id: string;
  name: string;
  slot: AdSlotKey;
  adType: AdType;
  status: AdStatus;
  priority: number;
  hideForAdmin: boolean;
  desktopMediaId: string | null;
  mobileMediaId: string | null;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
  imageAlt: string;
  targetUrl: string;
  openInNewTab: boolean;
  networkCode: string;
  frameHeightDesktop: number;
  frameHeightMobile: number;
  cooldownMinutes: number;
  closeDelaySeconds: number;
  startsAt: string | null;
  endsAt: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  updatedAt: string;
}

export interface AdminAdsListDTO {
  items: AdminAdItemDTO[];
  summary: {
    total: number;
    active: number;
    draft: number;
    paused: number;
    impressions: number;
    clicks: number;
    ctr: number;
  };
}

function assertAdmin(actor: SessionUser | null | undefined): SessionUser {
  if (!actor || actor.role !== "admin") {
    throw new AppError(
      "FORBIDDEN",
      "Anda tidak memiliki izin admin untuk tindakan ini.",
    );
  }
  return actor;
}

function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toIsoInput(d: Date | null): string | null {
  if (!d) return null;
  const iso = d.toISOString();
  // Trim to YYYY-MM-DDTHH:mm for datetime-local input friendliness
  return iso.slice(0, 16);
}

function isAdReadyForActivation(row: {
  adType: AdType;
  desktopMediaId: string | null;
  mobileMediaId: string | null;
  targetUrl: string | null;
  networkCode: string | null;
}): string | null {
  if (row.adType === "banner") {
    if (!row.desktopMediaId && !row.mobileMediaId) {
      return "Banner harus memiliki minimal satu gambar (desktop atau mobile) sebelum diaktifkan.";
    }
    if (!isSafeHttpUrl(row.targetUrl)) {
      return "Banner harus memiliki URL tujuan http:// atau https:// yang valid sebelum diaktifkan.";
    }
    return null;
  }
  if (!row.networkCode || row.networkCode.trim().length === 0) {
    return "Iklan Ad Network harus memiliki kode script/HTML sebelum diaktifkan.";
  }
  return null;
}

function isWithinSchedule(
  row: { startsAt: Date | null; endsAt: Date | null },
  now: Date,
): boolean {
  if (row.startsAt && row.startsAt.getTime() > now.getTime()) return false;
  if (row.endsAt && row.endsAt.getTime() < now.getTime()) return false;
  return true;
}

function pickWeightedCandidate<T extends { priority: number }>(
  candidates: T[],
): T | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const weights = candidates.map((c) => Math.max(1, c.priority));
  const total = weights.reduce((acc, w) => acc + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[0];
}

function toPublicAdDTO(row: typeof adCampaigns.$inferSelect): PublicAdDTO {
  return {
    id: row.id,
    slot: row.slot,
    adType: row.adType,
    name: row.name,
    imageAlt: row.imageAlt || row.name,
    desktopImageUrl: row.desktopMediaId ? `/api/media/${row.desktopMediaId}` : null,
    mobileImageUrl: row.mobileMediaId ? `/api/media/${row.mobileMediaId}` : null,
    clickUrl: `/api/ads/click/${row.id}`,
    openInNewTab: row.openInNewTab,
    networkCode: row.adType === "network" ? (row.networkCode ?? "") : null,
    frameHeightDesktop: row.frameHeightDesktop,
    frameHeightMobile: row.frameHeightMobile,
    cooldownMinutes: row.cooldownMinutes,
    closeDelaySeconds: row.closeDelaySeconds,
  };
}

export async function getActiveAdsForSlots(
  slots: AdSlotKey[],
  viewer: SessionUser | null,
): Promise<Record<AdSlotKey, PublicAdDTO | null>> {
  const result = {} as Record<AdSlotKey, PublicAdDTO | null>;
  for (const s of slots) result[s] = null;
  if (slots.length === 0) return result;

  let rows: (typeof adCampaigns.$inferSelect)[];
  try {
    rows = await db
      .select()
      .from(adCampaigns)
      .where(
        and(
          inArray(adCampaigns.slot, slots),
          eq(adCampaigns.status, "active"),
        ),
      )
      .orderBy(desc(adCampaigns.priority), desc(adCampaigns.updatedAt));
  } catch {
    // Graceful degradation if migration hasn't been applied yet
    return result;
  }

  const now = new Date();
  const isAdmin = viewer?.role === "admin";
  const bySlot = new Map<AdSlotKey, (typeof adCampaigns.$inferSelect)[]>();

  for (const row of rows) {
    if (isAdmin && row.hideForAdmin) continue;
    if (!isWithinSchedule(row, now)) continue;
    if (isAdReadyForActivation(row) !== null) continue;
    const list = bySlot.get(row.slot) ?? [];
    list.push(row);
    bySlot.set(row.slot, list);
  }

  const chosenIds: string[] = [];
  for (const s of slots) {
    const candidates = bySlot.get(s) ?? [];
    const chosen = pickWeightedCandidate(candidates);
    if (chosen) {
      result[s] = toPublicAdDTO(chosen);
      // Interstitial impressions are reported client-side only when actually displayed past cooldown
      if (s !== "reader_interstitial") {
        chosenIds.push(chosen.id);
      }
    }
  }

  if (chosenIds.length > 0) {
    // Record impressions atomically without blocking render on errors
    await db
      .update(adCampaigns)
      .set({ impressions: sql`${adCampaigns.impressions} + 1` })
      .where(inArray(adCampaigns.id, chosenIds))
      .catch(() => {});
  }

  return result;
}

export async function getActiveAdForSlot(
  slot: AdSlotKey,
  viewer: SessionUser | null,
): Promise<PublicAdDTO | null> {
  const map = await getActiveAdsForSlots([slot], viewer);
  return map[slot] ?? null;
}

export async function resolveAdClick(
  adId: string,
): Promise<{ targetUrl: string } | null> {
  if (!/^[0-9a-f-]{36}$/.test(adId)) return null;

  const [row] = await db
    .select()
    .from(adCampaigns)
    .where(and(eq(adCampaigns.id, adId), eq(adCampaigns.status, "active")))
    .limit(1);

  if (!row || row.adType !== "banner" || !isSafeHttpUrl(row.targetUrl)) {
    return null;
  }
  if (!isWithinSchedule(row, new Date())) return null;

  await db
    .update(adCampaigns)
    .set({ clicks: sql`${adCampaigns.clicks} + 1` })
    .where(eq(adCampaigns.id, row.id))
    .catch(() => {});

  return { targetUrl: row.targetUrl! };
}

export async function recordAdImpression(adId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(adId)) return false;

  const [row] = await db
    .select({
      id: adCampaigns.id,
      startsAt: adCampaigns.startsAt,
      endsAt: adCampaigns.endsAt,
    })
    .from(adCampaigns)
    .where(and(eq(adCampaigns.id, adId), eq(adCampaigns.status, "active")))
    .limit(1);

  if (!row || !isWithinSchedule(row, new Date())) return false;

  await db
    .update(adCampaigns)
    .set({ impressions: sql`${adCampaigns.impressions} + 1` })
    .where(eq(adCampaigns.id, row.id))
    .catch(() => {});

  return true;
}

export async function listAdminAds(
  actor: SessionUser | null,
  filter?: { slot?: string; status?: string },
): Promise<AdminAdsListDTO> {
  assertAdmin(actor);

  const allRows = await db
    .select()
    .from(adCampaigns)
    .orderBy(desc(adCampaigns.updatedAt), desc(adCampaigns.createdAt));

  let active = 0;
  let draft = 0;
  let paused = 0;
  let totalImpressions = 0;
  let totalClicks = 0;

  for (const r of allRows) {
    if (r.status === "active") active++;
    else if (r.status === "paused") paused++;
    else draft++;
    totalImpressions += r.impressions;
    totalClicks += r.clicks;
  }

  const slotFilter = filter?.slot?.trim() || "";
  const statusFilter = filter?.status?.trim() || "";

  const filtered = allRows.filter((r) => {
    if (slotFilter && r.slot !== slotFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const items: AdminAdItemDTO[] = filtered.map((r) => ({
    id: r.id,
    name: r.name,
    slot: r.slot,
    adType: r.adType,
    status: r.status,
    priority: r.priority,
    hideForAdmin: r.hideForAdmin,
    desktopMediaId: r.desktopMediaId,
    mobileMediaId: r.mobileMediaId,
    desktopImageUrl: r.desktopMediaId ? `/api/media/${r.desktopMediaId}` : null,
    mobileImageUrl: r.mobileMediaId ? `/api/media/${r.mobileMediaId}` : null,
    imageAlt: r.imageAlt,
    targetUrl: r.targetUrl ?? "",
    openInNewTab: r.openInNewTab,
    networkCode: r.networkCode ?? "",
    frameHeightDesktop: r.frameHeightDesktop,
    frameHeightMobile: r.frameHeightMobile,
    cooldownMinutes: r.cooldownMinutes,
    closeDelaySeconds: r.closeDelaySeconds,
    startsAt: toIsoInput(r.startsAt),
    endsAt: toIsoInput(r.endsAt),
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: r.impressions > 0 ? Number(((r.clicks / r.impressions) * 100).toFixed(2)) : 0,
    updatedAt: formatDateShort(r.updatedAt),
  }));

  return {
    items,
    summary: {
      total: allRows.length,
      active,
      draft,
      paused,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr:
        totalImpressions > 0
          ? Number(((totalClicks / totalImpressions) * 100).toFixed(2))
          : 0,
    },
  };
}

async function cleanupOrphanAdMedia(mediaId: string | null) {
  if (!mediaId) return;
  const [stillUsed] = await db
    .select({ id: adCampaigns.id })
    .from(adCampaigns)
    .where(
      or(
        eq(adCampaigns.desktopMediaId, mediaId),
        eq(adCampaigns.mobileMediaId, mediaId),
      ),
    )
    .limit(1);
  if (stillUsed) return;

  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.kind, "ad")))
    .limit(1);
  if (!asset) return;

  await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
  await removeMediaFile(asset.storageKey);
}

export async function createAdminAd(
  actor: SessionUser | null,
  rawInput: unknown,
  files?: { desktopBuffer?: Buffer | null; mobileBuffer?: Buffer | null },
): Promise<{ id: string; status: AdStatus }> {
  const admin = assertAdmin(actor);
  const parsed = createAdSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Data kampanye iklan tidak valid.",
    );
  }
  const data = parsed.data;

  let desktopMediaId: string | null = null;
  let mobileMediaId: string | null = null;
  const uploadedKeys: string[] = [];

  try {
    if (files?.desktopBuffer && files.desktopBuffer.length > 0) {
      const stored = await stageAndCommitMediaBuffer({
        buffer: files.desktopBuffer,
        kind: "ad",
      });
      uploadedKeys.push(stored.storageKey);
      await db.insert(mediaAssets).values({
        id: stored.id,
        kind: "ad",
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        byteSize: stored.byteSize,
        width: stored.width,
        height: stored.height,
        sha256: stored.sha256,
        createdBy: admin.id,
      });
      desktopMediaId = stored.id;
    }

    if (files?.mobileBuffer && files.mobileBuffer.length > 0) {
      const stored = await stageAndCommitMediaBuffer({
        buffer: files.mobileBuffer,
        kind: "ad",
      });
      uploadedKeys.push(stored.storageKey);
      await db.insert(mediaAssets).values({
        id: stored.id,
        kind: "ad",
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        byteSize: stored.byteSize,
        width: stored.width,
        height: stored.height,
        sha256: stored.sha256,
        createdBy: admin.id,
      });
      mobileMediaId = stored.id;
    }

    const candidateRow = {
      adType: data.adType,
      desktopMediaId,
      mobileMediaId,
      targetUrl: data.targetUrl || null,
      networkCode: data.networkCode || null,
    };

    if (data.status === "active") {
      const reason = isAdReadyForActivation(candidateRow);
      if (reason) {
        throw new AppError("VALIDATION_ERROR", reason);
      }
    }

    const id = randomUUID();
    await db.insert(adCampaigns).values({
      id,
      name: data.name,
      slot: data.slot,
      adType: data.adType,
      status: data.status,
      priority: data.priority,
      hideForAdmin: data.hideForAdmin,
      desktopMediaId,
      mobileMediaId,
      imageAlt: data.imageAlt,
      targetUrl: data.targetUrl || null,
      openInNewTab: data.openInNewTab,
      networkCode: data.networkCode || null,
      frameHeightDesktop: data.frameHeightDesktop,
      frameHeightMobile: data.frameHeightMobile,
      cooldownMinutes: data.cooldownMinutes,
      closeDelaySeconds: data.closeDelaySeconds,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      createdBy: admin.id,
    });

    return { id, status: data.status };
  } catch (err) {
    // Clean up any staged files/media rows on failure
    if (desktopMediaId) {
      await db.delete(mediaAssets).where(eq(mediaAssets.id, desktopMediaId)).catch(() => {});
    }
    if (mobileMediaId) {
      await db.delete(mediaAssets).where(eq(mediaAssets.id, mobileMediaId)).catch(() => {});
    }
    for (const k of uploadedKeys) {
      await removeMediaFile(k).catch(() => {});
    }
    throw err;
  }
}

export async function updateAdminAd(
  actor: SessionUser | null,
  rawInput: unknown,
  files?: { desktopBuffer?: Buffer | null; mobileBuffer?: Buffer | null },
): Promise<{ id: string }> {
  const admin = assertAdmin(actor);
  const parsed = updateAdSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Data pembaruan iklan tidak valid.",
    );
  }
  const data = parsed.data;

  const [existing] = await db
    .select()
    .from(adCampaigns)
    .where(eq(adCampaigns.id, data.adId))
    .limit(1);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Kampanye iklan tidak ditemukan.");
  }

  let nextDesktopMediaId = existing.desktopMediaId;
  let nextMobileMediaId = existing.mobileMediaId;
  let oldDesktopToClean: string | null = null;
  let oldMobileToClean: string | null = null;

  if (files?.desktopBuffer && files.desktopBuffer.length > 0) {
    const stored = await stageAndCommitMediaBuffer({
      buffer: files.desktopBuffer,
      kind: "ad",
    });
    await db.insert(mediaAssets).values({
      id: stored.id,
      kind: "ad",
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      byteSize: stored.byteSize,
      width: stored.width,
      height: stored.height,
      sha256: stored.sha256,
      createdBy: admin.id,
    });
    oldDesktopToClean = existing.desktopMediaId;
    nextDesktopMediaId = stored.id;
  }

  if (files?.mobileBuffer && files.mobileBuffer.length > 0) {
    const stored = await stageAndCommitMediaBuffer({
      buffer: files.mobileBuffer,
      kind: "ad",
    });
    await db.insert(mediaAssets).values({
      id: stored.id,
      kind: "ad",
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      byteSize: stored.byteSize,
      width: stored.width,
      height: stored.height,
      sha256: stored.sha256,
      createdBy: admin.id,
    });
    oldMobileToClean = existing.mobileMediaId;
    nextMobileMediaId = stored.id;
  }

  if (data.status === "active") {
    const reason = isAdReadyForActivation({
      adType: data.adType,
      desktopMediaId: nextDesktopMediaId,
      mobileMediaId: nextMobileMediaId,
      targetUrl: data.targetUrl || null,
      networkCode: data.networkCode || null,
    });
    if (reason) {
      throw new AppError("VALIDATION_ERROR", reason);
    }
  }

  await db
    .update(adCampaigns)
    .set({
      name: data.name,
      slot: data.slot,
      adType: data.adType,
      status: data.status,
      priority: data.priority,
      hideForAdmin: data.hideForAdmin,
      desktopMediaId: nextDesktopMediaId,
      mobileMediaId: nextMobileMediaId,
      imageAlt: data.imageAlt,
      targetUrl: data.targetUrl || null,
      openInNewTab: data.openInNewTab,
      networkCode: data.networkCode || null,
      frameHeightDesktop: data.frameHeightDesktop,
      frameHeightMobile: data.frameHeightMobile,
      cooldownMinutes: data.cooldownMinutes,
      closeDelaySeconds: data.closeDelaySeconds,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    })
    .where(eq(adCampaigns.id, existing.id));

  await cleanupOrphanAdMedia(oldDesktopToClean);
  await cleanupOrphanAdMedia(oldMobileToClean);

  return { id: existing.id };
}

export async function setAdminAdStatus(
  actor: SessionUser | null,
  rawInput: unknown,
): Promise<{ id: string; status: AdStatus }> {
  assertAdmin(actor);
  const parsed = adStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Status iklan tidak valid.");
  }

  const [existing] = await db
    .select()
    .from(adCampaigns)
    .where(eq(adCampaigns.id, parsed.data.adId))
    .limit(1);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Kampanye iklan tidak ditemukan.");
  }

  if (parsed.data.status === "active") {
    const reason = isAdReadyForActivation(existing);
    if (reason) {
      throw new AppError("VALIDATION_ERROR", reason);
    }
  }

  await db
    .update(adCampaigns)
    .set({ status: parsed.data.status })
    .where(eq(adCampaigns.id, existing.id));

  return { id: existing.id, status: parsed.data.status };
}

export async function resetAdminAdStats(
  actor: SessionUser | null,
  adId: string,
): Promise<{ id: string }> {
  assertAdmin(actor);
  if (!/^[0-9a-f-]{36}$/.test(adId)) {
    throw new AppError("VALIDATION_ERROR", "ID kampanye iklan tidak valid.");
  }
  const [existing] = await db
    .select({ id: adCampaigns.id })
    .from(adCampaigns)
    .where(eq(adCampaigns.id, adId))
    .limit(1);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Kampanye iklan tidak ditemukan.");
  }

  await db
    .update(adCampaigns)
    .set({ impressions: 0, clicks: 0 })
    .where(eq(adCampaigns.id, adId));

  return { id: adId };
}

export async function deleteAdminAd(
  actor: SessionUser | null,
  adId: string,
): Promise<{ id: string }> {
  assertAdmin(actor);
  if (!/^[0-9a-f-]{36}$/.test(adId)) {
    throw new AppError("VALIDATION_ERROR", "ID kampanye iklan tidak valid.");
  }

  const [existing] = await db
    .select()
    .from(adCampaigns)
    .where(eq(adCampaigns.id, adId))
    .limit(1);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Kampanye iklan tidak ditemukan.");
  }

  await db.delete(adCampaigns).where(eq(adCampaigns.id, adId));
  await cleanupOrphanAdMedia(existing.desktopMediaId);
  await cleanupOrphanAdMedia(existing.mobileMediaId);

  return { id: adId };
}
