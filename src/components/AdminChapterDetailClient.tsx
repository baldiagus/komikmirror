"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deletePanelAction,
  reorderPanelsAction,
  setChapterStatusAction,
  updateChapterAction,
  uploadChapterPanelsAction,
} from "@/actions/admin";

interface AdminPanel {
  id: string;
  mediaId: string;
  position: number;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  url: string;
}

interface AdminChapterDetail {
  id: string;
  seriesId: string;
  publicId: string;
  chapterNumber: string;
  sortOrder: number;
  title: string;
  status: "draft" | "published" | "archived";
  isSynthetic: boolean;
  series: {
    id: string;
    publicId: string;
    title: string;
    status: "draft" | "published" | "archived";
  };
  panels: AdminPanel[];
}

export function AdminChapterDetailClient({
  chapter,
}: {
  chapter: AdminChapterDetail;
}) {
  const router = useRouter();
  const [panels, setPanels] = useState(chapter.panels);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPanels(chapter.panels);
  }, [chapter.panels]);

  function handleUpdateChapter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateChapterAction(fd);
      if (res.ok) {
        setNotice({ kind: "ok", text: res.message ?? "Tersimpan." });
        router.refresh();
      } else {
        setNotice({ kind: "error", text: res.error });
      }
    });
  }

  function handleStatus(status: "draft" | "published" | "archived") {
    setNotice(null);
    startTransition(async () => {
      const res = await setChapterStatusAction(chapter.id, status);
      if (res.ok) {
        setNotice({ kind: "ok", text: res.message ?? "Status diperbarui." });
        router.refresh();
      } else {
        setNotice({ kind: "error", text: res.error });
      }
    });
  }

  function handleUploadPanels(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await uploadChapterPanelsAction(fd);
      if (res.ok) {
        setNotice({ kind: "ok", text: res.message ?? "Panel diunggah." });
        form.reset();
        router.refresh();
      } else {
        setNotice({ kind: "error", text: res.error });
      }
    });
  }

  function handleMove(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= panels.length) return;
    const next = [...panels];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setPanels(next);
    setNotice(null);
    startTransition(async () => {
      const res = await reorderPanelsAction(
        chapter.seriesId,
        chapter.id,
        next.map((p) => p.id),
      );
      if (res.ok) {
        setNotice({ kind: "ok", text: res.message ?? "Urutan panel diperbarui." });
        router.refresh();
      } else {
        setPanels(chapter.panels);
        setNotice({ kind: "error", text: res.error });
      }
    });
  }

  function handleDeletePanel(panelId: string) {
    setNotice(null);
    startTransition(async () => {
      const res = await deletePanelAction(chapter.seriesId, chapter.id, panelId);
      if (res.ok) {
        setNotice({ kind: "ok", text: res.message ?? "Panel dihapus." });
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
        <div className="actions" style={{ marginBlock: 0 }}>
          <span className={`status-pill ${chapter.status}`}>
            {chapter.status}
          </span>
          <Link className="chip" href={`/chapter/${chapter.publicId}`}>
            Pratinjau Pembaca
          </Link>
        </div>
        <div className="actions" style={{ marginBlock: 0 }}>
          {chapter.status !== "published" && !chapter.isSynthetic && (
            <button
              type="button"
              className="primary"
              onClick={() => handleStatus("published")}
              disabled={isPending}
            >
              Terbitkan Chapter
            </button>
          )}
          {chapter.status !== "draft" && (
            <button
              type="button"
              className="chip"
              onClick={() => handleStatus("draft")}
              disabled={isPending}
            >
              Jadikan Draft
            </button>
          )}
          {chapter.status !== "archived" && (
            <button
              type="button"
              className="danger-btn"
              onClick={() => handleStatus("archived")}
              disabled={isPending}
            >
              Arsipkan Chapter
            </button>
          )}
        </div>
      </div>

      <form className="surface side stack" onSubmit={handleUpdateChapter}>
        <h2>Metadata Chapter</h2>
        <input type="hidden" name="chapterId" value={chapter.id} />
        <div className="two-col">
          <label>
            Nomor Chapter
            <input
              name="chapterNumber"
              required
              pattern="^\d{1,8}(\.\d{1,2})?$"
              defaultValue={chapter.chapterNumber}
            />
          </label>
          <label>
            Urutan
            <input
              name="sortOrder"
              type="number"
              min={0}
              required
              defaultValue={chapter.sortOrder}
            />
          </label>
        </div>
        <label>
          Judul Chapter
          <input name="title" maxLength={255} defaultValue={chapter.title} />
        </label>
        <button type="submit" className="primary" disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan Metadata"}
        </button>
      </form>

      <section className="surface side stack">
        <h2>Unggah Panel Gambar</h2>
        <form className="stack" onSubmit={handleUploadPanels}>
          <input type="hidden" name="seriesId" value={chapter.seriesId} />
          <input type="hidden" name="chapterId" value={chapter.id} />
          <label>
            Pilih satu atau beberapa panel (PNG, JPEG, WebP · maks 8 MB per berkas)
            <input
              type="file"
              name="panels"
              accept="image/webp,image/png,image/jpeg"
              multiple
              required
            />
          </label>
          <button type="submit" className="primary" disabled={isPending}>
            {isPending ? "Mengunggah..." : "Unggah Panel"}
          </button>
        </form>
      </section>

      <section className="stack">
        <h2>Urutan Panel ({panels.length})</h2>
        {panels.length > 0 ? (
          panels.map((panel, idx) => (
            <div
              key={panel.id}
              className="surface panel-admin-row"
              data-panel-id={panel.id}
              data-media-id={panel.mediaId}
            >
              <img
                className="panel-thumb"
                src={panel.url}
                alt={`Panel ${idx + 1}`}
              />
              <div>
                <strong>Panel #{idx + 1}</strong>
                <div className="meta num">
                  {panel.mimeType} · {panel.width}×{panel.height} px ·{" "}
                  {(panel.byteSize / 1024).toFixed(1)} KB
                </div>
                <div className="meta">
                  URL media: <code>{panel.url}</code>
                </div>
              </div>
              <div className="actions" style={{ marginBlock: 0 }}>
                <button
                  type="button"
                  className="chip"
                  disabled={isPending || idx === 0}
                  onClick={() => handleMove(idx, -1)}
                  aria-label={`Naikkan panel ${idx + 1}`}
                >
                  Naik
                </button>
                <button
                  type="button"
                  className="chip"
                  disabled={isPending || idx === panels.length - 1}
                  onClick={() => handleMove(idx, 1)}
                  aria-label={`Turunkan panel ${idx + 1}`}
                >
                  Turun
                </button>
                <button
                  type="button"
                  className="danger-btn"
                  disabled={isPending}
                  onClick={() => handleDeletePanel(panel.id)}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="meta">Belum ada panel diunggah untuk chapter ini.</p>
        )}
      </section>
    </div>
  );
}
