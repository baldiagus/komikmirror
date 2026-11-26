"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAdAction,
  deleteAdAction,
  resetAdStatsAction,
  setAdStatusAction,
  updateAdAction,
} from "@/actions/ads";
import type { AdminAdItemDTO } from "@/dal/ads";
import {
  AD_SLOT_META,
  AD_SLOTS,
  type AdSlotKey,
  type AdStatus,
  type AdType,
} from "@/lib/validation";

function statusLabel(status: AdStatus): string {
  if (status === "active") return "Aktif";
  if (status === "paused") return "Dijeda";
  return "Draft";
}

function statusPillClass(status: AdStatus): string {
  if (status === "active") return "status-pill published";
  if (status === "draft") return "status-pill draft";
  return "status-pill";
}

function AdFormFields({
  ad,
  adType,
  onAdTypeChange,
  slot,
  onSlotChange,
}: {
  ad?: AdminAdItemDTO;
  adType: AdType;
  onAdTypeChange: (next: AdType) => void;
  slot: AdSlotKey;
  onSlotChange: (next: AdSlotKey) => void;
}) {
  return (
    <>
      <div className="two-col">
        <label>
          Nama Kampanye
          <input
            type="text"
            name="name"
            required
            maxLength={160}
            defaultValue={ad?.name ?? ""}
            placeholder="Contoh: Sponsor Topup Game Mei"
          />
        </label>
        <label>
          Posisi Slot
          <select
            name="slot"
            value={slot}
            onChange={(e) => onSlotChange(e.target.value as AdSlotKey)}
          >
            {AD_SLOTS.map((s) => (
              <option key={s} value={s}>
                {AD_SLOT_META[s].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {slot === "reader_interstitial" && (
        <div className="stack ad-fieldset">
          <div className="two-col">
            <label>
              Jeda Cooldown (menit · 1–1440)
              <input
                type="number"
                name="cooldownMinutes"
                min={1}
                max={1440}
                defaultValue={ad?.cooldownMinutes ?? 5}
              />
            </label>
            <label>
              Hitung Mundur Tombol × (detik · 0–15)
              <input
                type="number"
                name="closeDelaySeconds"
                min={0}
                max={15}
                defaultValue={ad?.closeDelaySeconds ?? 3}
              />
            </label>
          </div>
          <p className="meta" style={{ margin: 0 }}>
            Muncul otomatis saat pengguna membuka chapter pertama, lalu hanya
            muncul lagi saat pengguna mengakses chapter baru setelah jeda
            cooldown terpenuhi.
          </p>
        </div>
      )}

      <div className="two-col">
        <label>
          Tipe Iklan
          <select
            name="adType"
            value={adType}
            onChange={(e) => onAdTypeChange(e.target.value as AdType)}
          >
            <option value="banner">Banner Mandiri (Gambar + Link)</option>
            <option value="network">Kode Ad Network (Script / HTML)</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={ad?.status ?? "draft"}>
            <option value="draft">Draft (belum tampil)</option>
            <option value="active">Aktif (langsung tayang)</option>
            <option value="paused">Dijeda</option>
          </select>
        </label>
      </div>

      {adType === "banner" ? (
        <div className="stack ad-fieldset">
          <div className="two-col">
            <label>
              Gambar Banner Desktop (PNG/JPEG/WebP · maks 4 MB)
              <input
                type="file"
                name="desktopImage"
                accept="image/webp,image/png,image/jpeg"
              />
              {ad?.desktopImageUrl && (
                <span className="meta">
                  Saat ini terpasang — unggah baru untuk mengganti.
                </span>
              )}
            </label>
            <label>
              Gambar Banner Mobile (opsional · mis. 320×100)
              <input
                type="file"
                name="mobileImage"
                accept="image/webp,image/png,image/jpeg"
              />
              {ad?.mobileImageUrl && (
                <span className="meta">
                  Versi mobile terpasang — unggah baru untuk mengganti.
                </span>
              )}
            </label>
          </div>
          <div className="two-col">
            <label>
              URL Tujuan (https://...)
              <input
                type="url"
                name="targetUrl"
                maxLength={512}
                defaultValue={ad?.targetUrl ?? ""}
                placeholder="https://sponsor.example.com/promo"
              />
            </label>
            <label>
              Teks Alt / Deskripsi Banner
              <input
                type="text"
                name="imageAlt"
                maxLength={200}
                defaultValue={ad?.imageAlt ?? ""}
                placeholder="Promo Diskon Topup 20%"
              />
            </label>
          </div>
          <label className="ad-checkbox">
            <input
              type="checkbox"
              name="openInNewTab"
              defaultChecked={ad ? ad.openInNewTab : true}
            />
            <span>Buka tautan iklan di tab baru</span>
          </label>
        </div>
      ) : (
        <div className="stack ad-fieldset">
          <label>
            Kode HTML / Script Ad Network (AdSense, Adsterra, MGID, dll.)
            <textarea
              name="networkCode"
              rows={5}
              maxLength={16000}
              defaultValue={ad?.networkCode ?? ""}
              placeholder="<script async src=&quot;https://...&quot;></script>"
              style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12 }}
            />
          </label>
          <p className="meta" style={{ margin: 0 }}>
            Kode dijalankan di dalam <code>iframe</code> sandbox terisolasi
            (tanpa akses cookie/DOM utama) agar aman dari XSS.
          </p>
          <div className="two-col">
            <label>
              Tinggi Frame Desktop (px · 50–600)
              <input
                type="number"
                name="frameHeightDesktop"
                min={50}
                max={600}
                defaultValue={ad?.frameHeightDesktop ?? 100}
              />
            </label>
            <label>
              Tinggi Frame Mobile (px · 50–600)
              <input
                type="number"
                name="frameHeightMobile"
                min={50}
                max={600}
                defaultValue={ad?.frameHeightMobile ?? 100}
              />
            </label>
          </div>
        </div>
      )}

      <div className="two-col">
        <label>
          Jadwal Mulai (opsional · UTC)
          <input
            type="datetime-local"
            name="startsAt"
            defaultValue={ad?.startsAt ?? ""}
          />
        </label>
        <label>
          Jadwal Selesai (opsional · UTC)
          <input
            type="datetime-local"
            name="endsAt"
            defaultValue={ad?.endsAt ?? ""}
          />
        </label>
      </div>

      <div className="two-col">
        <label>
          Bobot Prioritas (0–1000 · makin besar makin sering muncul)
          <input
            type="number"
            name="priority"
            min={0}
            max={1000}
            defaultValue={ad?.priority ?? 10}
          />
        </label>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <label className="ad-checkbox">
            <input
              type="checkbox"
              name="hideForAdmin"
              defaultChecked={ad?.hideForAdmin ?? false}
            />
            <span>Sembunyikan iklan ini untuk akun Admin</span>
          </label>
        </div>
      </div>
    </>
  );
}

function AdminAdEditDrawer({
  ad,
  disabled,
  onSaved,
}: {
  ad: AdminAdItemDTO;
  disabled: boolean;
  onSaved: (msg: { kind: "ok" | "error"; text: string }) => void;
}) {
  const router = useRouter();
  const [adType, setAdType] = useState<AdType>(ad.adType);
  const [slot, setSlot] = useState<AdSlotKey>(ad.slot);
  const [saving, startSave] = useTransition();

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startSave(async () => {
      const res = await updateAdAction(fd);
      if (res.ok) {
        onSaved({ kind: "ok", text: res.message ?? "Kampanye diperbarui." });
        router.refresh();
      } else {
        onSaved({ kind: "error", text: res.error });
      }
    });
  }

  return (
    <details className="ad-edit-drawer">
      <summary className="chip">Edit Kampanye</summary>
      <form className="stack ad-edit-form" onSubmit={handleUpdate}>
        <input type="hidden" name="adId" value={ad.id} />
        <AdFormFields
          ad={ad}
          adType={adType}
          onAdTypeChange={setAdType}
          slot={slot}
          onSlotChange={setSlot}
        />
        <div className="actions" style={{ marginBlock: 0 }}>
          <button
            type="submit"
            className="primary"
            disabled={disabled || saving}
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function AdminAdsClient({
  ads,
  totalCount,
}: {
  ads: AdminAdItemDTO[];
  totalCount: number;
}) {
  const router = useRouter();
  const [createType, setCreateType] = useState<AdType>("banner");
  const [createSlot, setCreateSlot] = useState<AdSlotKey>("home_top");
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();
  const [, startRowAction] = useTransition();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startCreate(async () => {
      const res = await createAdAction(fd);
      if (res.ok) {
        setFeedback({ kind: "ok", text: res.message ?? "Iklan dibuat." });
        form.reset();
        setCreateType("banner");
        setCreateSlot("home_top");
        router.refresh();
      } else {
        setFeedback({ kind: "error", text: res.error });
      }
    });
  }

  function handleStatus(adId: string, nextStatus: AdStatus) {
    setFeedback(null);
    setBusyId(adId);
    startRowAction(async () => {
      try {
        const res = await setAdStatusAction(adId, nextStatus);
        if (res.ok) {
          setFeedback({ kind: "ok", text: res.message ?? "Status diperbarui." });
          router.refresh();
        } else {
          setFeedback({ kind: "error", text: res.error });
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleResetStats(adId: string) {
    setFeedback(null);
    setBusyId(adId);
    startRowAction(async () => {
      try {
        const res = await resetAdStatsAction(adId);
        if (res.ok) {
          setFeedback({ kind: "ok", text: res.message ?? "Statistik direset." });
          router.refresh();
        } else {
          setFeedback({ kind: "error", text: res.error });
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleDelete(ad: AdminAdItemDTO) {
    if (!window.confirm(`Hapus kampanye iklan "${ad.name}"?`)) return;
    setFeedback(null);
    setBusyId(ad.id);
    startRowAction(async () => {
      try {
        const res = await deleteAdAction(ad.id);
        if (res.ok) {
          setFeedback({ kind: "ok", text: res.message ?? "Kampanye dihapus." });
          router.refresh();
        } else {
          setFeedback({ kind: "error", text: res.error });
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      {feedback && (
        <div
          className={`alert ${feedback.kind}`}
          role={feedback.kind === "error" ? "alert" : "status"}
          style={{ marginBottom: 0 }}
        >
          {feedback.text}
        </div>
      )}

      <details
        className="surface import-disclosure"
        style={{ marginTop: 0 }}
        open={totalCount === 0}
      >
        <summary className="import-summary">
          <div>
            <strong>+ Buat Kampanye Iklan Baru</strong>
            <span className="meta">
              Mendukung Banner Mandiri (gambar desktop/mobile + tracking klik)
              dan Kode Ad Network (iframe sandbox).
            </span>
          </div>
        </summary>
        <div className="import-body">
          <form className="stack" onSubmit={handleCreate}>
            <AdFormFields
              adType={createType}
              onAdTypeChange={setCreateType}
              slot={createSlot}
              onSlotChange={setCreateSlot}
            />
            <div className="actions" style={{ marginBlock: "6px 0" }}>
              <button type="submit" className="primary" disabled={creating}>
                {creating ? "Menyimpan..." : "Buat Kampanye Iklan"}
              </button>
            </div>
          </form>
        </div>
      </details>

      {ads.length > 0 ? (
        <div className="stack" style={{ gap: 12 }}>
          {ads.map((ad) => {
            const isBusy = busyId === ad.id;
            const previewUrl = ad.desktopImageUrl ?? ad.mobileImageUrl;
            return (
              <article
                key={ad.id}
                className="surface ad-admin-card"
                data-ad-campaign-id={ad.id}
              >
                <div className="ad-admin-top">
                  {ad.adType === "banner" && previewUrl ? (
                    <img
                      className="ad-admin-thumb"
                      src={previewUrl}
                      alt={ad.imageAlt || ad.name}
                    />
                  ) : (
                    <div className="ad-admin-thumb ad-admin-thumb-placeholder">
                      {ad.adType === "network" ? "JS/HTML" : "Banner"}
                    </div>
                  )}

                  <div className="ad-admin-main">
                    <div className="admin-user-badges">
                      <strong>{ad.name}</strong>
                      <span className={statusPillClass(ad.status)}>
                        {statusLabel(ad.status)}
                      </span>
                      <span className="read-badge">
                        {ad.adType === "banner" ? "Banner" : "Ad Network"}
                      </span>
                      <span className="read-badge">
                        {AD_SLOT_META[ad.slot].label}
                      </span>
                      {ad.hideForAdmin && (
                        <span className="read-badge">Tersembunyi u/ Admin</span>
                      )}
                    </div>

                    <div className="meta ad-admin-meta">
                      {ad.adType === "banner" ? (
                        <span>
                          Target:{" "}
                          {ad.targetUrl ? (
                            <code>{ad.targetUrl}</code>
                          ) : (
                            <em>belum diatur</em>
                          )}
                          {" · "}
                          Gambar: {ad.desktopMediaId ? "Desktop" : "—"} /{" "}
                          {ad.mobileMediaId ? "Mobile" : "—"}
                        </span>
                      ) : (
                        <span>
                          Frame: <span className="num">{ad.frameHeightDesktop}px</span>{" "}
                          desktop / <span className="num">{ad.frameHeightMobile}px</span>{" "}
                          mobile ·{" "}
                          <span className="num">{ad.networkCode.length}</span>{" "}
                          karakter kode
                        </span>
                      )}
                    </div>

                    <div className="meta num ad-admin-stats">
                      <span>
                        Tayangan:{" "}
                        <strong>{ad.impressions.toLocaleString("id-ID")}</strong>
                      </span>
                      <span>
                        Klik:{" "}
                        <strong>{ad.clicks.toLocaleString("id-ID")}</strong>
                      </span>
                      <span>
                        CTR:{" "}
                        <strong className="points">{ad.ctr.toFixed(2)}%</strong>
                      </span>
                      <span>Prioritas: {ad.priority}</span>
                      {ad.slot === "reader_interstitial" && (
                        <span>
                          Cooldown: {ad.cooldownMinutes} mnt · Tutup:{" "}
                          {ad.closeDelaySeconds} dtk
                        </span>
                      )}
                      {(ad.startsAt || ad.endsAt) && (
                        <span>
                          Jadwal: {ad.startsAt ?? "sekarang"} →{" "}
                          {ad.endsAt ?? "tanpa batas"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ad-admin-actions">
                  {ad.status !== "active" ? (
                    <button
                      type="button"
                      className="primary"
                      disabled={isBusy}
                      onClick={() => handleStatus(ad.id, "active")}
                    >
                      Aktifkan
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="chip"
                      disabled={isBusy}
                      onClick={() => handleStatus(ad.id, "paused")}
                    >
                      Jeda
                    </button>
                  )}

                  <button
                    type="button"
                    className="chip"
                    disabled={isBusy}
                    onClick={() => handleResetStats(ad.id)}
                  >
                    Reset Statistik
                  </button>

                  <button
                    type="button"
                    className="danger-btn"
                    disabled={isBusy}
                    onClick={() => handleDelete(ad)}
                  >
                    Hapus
                  </button>
                </div>

                <AdminAdEditDrawer
                  ad={ad}
                  disabled={isBusy}
                  onSaved={(msg) => setFeedback(msg)}
                />
              </article>
            );
          })}
        </div>
      ) : (
        <section className="empty surface">
          <h2>Belum ada kampanye iklan</h2>
          <p className="meta">
            Buat kampanye baru di atas untuk menampilkan banner mandiri atau
            kode Ad Network pada slot halaman publik.
          </p>
        </section>
      )}
    </div>
  );
}
