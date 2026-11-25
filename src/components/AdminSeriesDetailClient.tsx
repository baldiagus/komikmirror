"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createChapterAction,
  setChapterStatusAction,
  setSeriesStatusAction,
  updateSeriesAction,
  uploadSeriesCoverAction,
} from "@/actions/admin";
import { Icon } from "@/components/Icons";
import { ALL_GENRES, PUBLICATION_STATUSES, SERIES_TYPES } from "@/lib/validation";

interface AdminSeriesDetail {
  id: string;
  publicId: string;
  slug: string;
  title: string;
  type: "Manhwa" | "Manhua" | "Manga";
  genre: string;
  publicationStatus: "Ongoing" | "Completed" | "Hiatus";
  status: "draft" | "published" | "archived";
  rank: number;
  followers: number;
  rating: string;
  summary: string;
  coverMediaId: string | null;
  coverUrl: string | null;
  externalCoverUrl: string | null;
  chapters: {
    id: string;
    publicId: string;
    number: string;
    rawNumber: string;
    sortOrder: number;
    title: string;
    status: "draft" | "published" | "archived";
    isSynthetic: boolean;
    panelCount: number;
    updatedAt: string;
  }[];
}

export function AdminSeriesDetailClient({
  series,
}: {
  series: AdminSeriesDetail;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const genreOptions = ALL_GENRES.includes(
    series.genre as (typeof ALL_GENRES)[number],
  )
    ? [...ALL_GENRES]
    : [series.genre, ...ALL_GENRES];

  function handleUpdateSeries(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateSeriesAction(fd);
      if (res.ok) {
        setNotice({ kind: "ok", text: res.message ?? "Tersimpan." });
        router.refresh();
      } else {
        setNotice({ kind: "error", text: res.error });
      }
    });
  }

  function handleSeriesStatus(status: "draft" | "published" | "archived") {
    setNotice(null);
    startTransition(async () => {
      const res = await setSeriesStatusAction(series.id, status);
      if (res.ok) {
        setNotice({ kind: "ok", text: res.message ?? "Status diperbarui." });
        router.refresh();
      } else {
        setNotice({ kind: "error", text: res.error });
      }
    });
  }

  function handleCoverUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await uploadSeriesCoverAction(fd);
      if (res.ok) {
        setNotice({ kind: "ok", text: res.message ?? "Cover diunggah." });
        form.reset();
        router.refresh();
      } else {
        setNotice({ kind: "error", text: res.error });
      }
    });
  }

  function handleCreateChapter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await createChapterAction(fd);
      if (res.ok) {
        setNotice({ kind: "ok", text: res.message ?? "Chapter dibuat." });
        form.reset();
        router.push(`/admin/series/${series.id}/chapters/${res.data.id}`);
        router.refresh();
      } else {
        setNotice({ kind: "error", text: res.error });
      }
    });
  }

  function handleChapterStatus(
    chapterId: string,
    status: "draft" | "published" | "archived",
  ) {
    setNotice(null);
    startTransition(async () => {
      const res = await setChapterStatusAction(chapterId, status);
      if (res.ok) {
        setNotice({ kind: "ok", text: res.message ?? "Status chapter diubah." });
        router.refresh();
      } else {
        setNotice({ kind: "error", text: res.error });
      }
    });
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      {notice && (
        <div
          className={`alert ${notice.kind === "ok" ? "ok" : "error"}`}
          role="status"
        >
          {notice.text}
        </div>
      )}

      <div className="section-heading" style={{ marginBlock: 0 }}>
        <div>
          <span className={`status-pill ${series.status}`}>{series.status}</span>
          <span className="meta" style={{ marginLeft: 10 }}>
            Public URL:{" "}
            <Link href={`/series/${series.publicId}`}>
              /series/{series.publicId}
            </Link>
          </span>
        </div>
        <div className="actions" style={{ marginBlock: 0 }}>
          {series.status !== "published" && (
            <button
              type="button"
              className="primary"
              onClick={() => handleSeriesStatus("published")}
              disabled={isPending}
            >
              Terbitkan Seri
            </button>
          )}
          {series.status !== "draft" && (
            <button
              type="button"
              className="chip"
              onClick={() => handleSeriesStatus("draft")}
              disabled={isPending}
            >
              Jadikan Draft
            </button>
          )}
          {series.status !== "archived" && (
            <button
              type="button"
              className="danger-btn"
              onClick={() => handleSeriesStatus("archived")}
              disabled={isPending}
            >
              Arsipkan Seri
            </button>
          )}
        </div>
      </div>

      <div className="admin-grid">
        <form className="surface side stack" onSubmit={handleUpdateSeries}>
          <h2>Detail Seri</h2>
          <input type="hidden" name="seriesId" value={series.id} />
          <label>
            Judul
            <input name="title" required maxLength={255} defaultValue={series.title} />
          </label>
          <label>
            Slug
            <input
              name="slug"
              required
              maxLength={160}
              pattern="[a-z0-9-]+"
              defaultValue={series.slug}
            />
          </label>
          <div className="two-col">
            <label>
              Jenis
              <select name="type" defaultValue={series.type}>
                {SERIES_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Genre
              <select name="genre" defaultValue={series.genre}>
                {genreOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="two-col">
            <label>
              Status rilis
              <select
                name="publicationStatus"
                defaultValue={series.publicationStatus}
              >
                {PUBLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rating
              <input name="rating" defaultValue={series.rating} />
            </label>
          </div>
          <div className="two-col">
            <label>
              Rank
              <input name="rank" type="number" min={0} defaultValue={series.rank} />
            </label>
            <label>
              Pengikut
              <input
                name="followers"
                type="number"
                min={0}
                defaultValue={series.followers}
              />
            </label>
          </div>
          <label>
            Sinopsis
            <textarea name="summary" maxLength={5000} defaultValue={series.summary} />
          </label>
          <button type="submit" className="primary" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>

        <section className="surface side stack">
          <h2>Cover Seri</h2>
          {series.coverUrl ? (
            <img
              className="cover"
              src={series.coverUrl}
              alt={series.title}
              style={{ maxWidth: 220 }}
            />
          ) : (
            <p className="meta">Belum ada cover lokal tersimpan.</p>
          )}
          {series.externalCoverUrl && !series.coverUrl && (
            <p className="meta">
              Referensi cover eksternal tercatat di snapshot (tidak diambil oleh
              server). Unggah cover lokal untuk menggantinya.
            </p>
          )}
          <form className="stack" onSubmit={handleCoverUpload}>
            <input type="hidden" name="seriesId" value={series.id} />
            <label>
              Unggah cover (PNG, JPEG, WebP · maks 5 MB)
              <input
                type="file"
                name="cover"
                accept="image/webp,image/png,image/jpeg"
                required
              />
            </label>
            <button type="submit" className="chip" disabled={isPending}>
              {isPending ? "Mengunggah..." : "Unggah Cover"}
            </button>
          </form>
        </section>
      </div>

      <section className="surface side stack">
        <h2>Tambah Chapter Baru</h2>
        <form className="two-col" onSubmit={handleCreateChapter}>
          <input type="hidden" name="seriesId" value={series.id} />
          <label>
            Nomor Chapter (mendukung desimal, mis. 12.5)
            <input
              name="chapterNumber"
              required
              pattern="^\d{1,8}(\.\d{1,2})?$"
              placeholder="1 atau 12.5"
            />
          </label>
          <label>
            Judul Chapter (opsional)
            <input name="title" maxLength={255} placeholder="Contoh: Babak Pertama" />
          </label>
          <label>
            Urutan (opsional)
            <input name="sortOrder" type="number" min={0} placeholder="Otomatis" />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" className="primary" disabled={isPending}>
              <Icon name="plus" /> Buat Chapter Draft
            </button>
          </div>
        </form>
      </section>

      <section className="stack">
        <div className="section-heading">
          <h2>Daftar Chapter ({series.chapters.length})</h2>
        </div>
        {series.chapters.length > 0 ? (
          series.chapters.map((ch) => (
            <div key={ch.id} className="row">
              <div>
                <Link
                  href={`/admin/series/${series.id}/chapters/${ch.id}`}
                  style={{ fontWeight: 500 }}
                >
                  Chapter {ch.number}
                  {ch.title ? ` — ${ch.title}` : ""}
                </Link>
                <div className="meta">
                  Urutan #{ch.sortOrder} · {ch.panelCount} panel ·{" "}
                  <span className={`status-pill ${ch.status}`}>{ch.status}</span>
                  {ch.isSynthetic && " · (fallback sintetis)"}
                </div>
              </div>
              <div className="actions" style={{ marginBlock: 0 }}>
                <Link
                  className="chip"
                  href={`/admin/series/${series.id}/chapters/${ch.id}`}
                >
                  Kelola Panel
                </Link>
                {ch.status !== "published" && !ch.isSynthetic && (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => handleChapterStatus(ch.id, "published")}
                    disabled={isPending}
                  >
                    Terbitkan
                  </button>
                )}
                {ch.status === "published" && (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => handleChapterStatus(ch.id, "draft")}
                    disabled={isPending}
                  >
                    Draft
                  </button>
                )}
                {ch.status !== "archived" && (
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => handleChapterStatus(ch.id, "archived")}
                    disabled={isPending}
                  >
                    Arsipkan
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="meta">Belum ada chapter untuk seri ini.</p>
        )}
      </section>
    </div>
  );
}
