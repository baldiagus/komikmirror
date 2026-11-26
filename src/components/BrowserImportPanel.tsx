"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importBrowserLibraryAction } from "@/actions/library";

const LEGACY_STORAGE_KEY = "shinigami-lab-v1";

interface CandidateData {
  bookmarks: string[];
  queue: string[];
  history: string[];
}

function parseCandidate(raw: unknown): CandidateData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const asStrings = (v: unknown, limit: number) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, limit)
      : [];
  const bookmarks = asStrings(obj.bookmarks, 500);
  const queue = asStrings(obj.queue, 30);
  const history = asStrings(obj.history, 1000);
  if (bookmarks.length === 0 && queue.length === 0 && history.length === 0) {
    return null;
  }
  return { bookmarks, queue, history };
}

export function BrowserImportPanel() {
  const router = useRouter();
  const [localCandidate, setLocalCandidate] = useState<CandidateData | null>(null);
  const [fileCandidate, setFileCandidate] = useState<CandidateData | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const parsed = parseCandidate(JSON.parse(raw));
      if (parsed) setLocalCandidate(parsed);
    } catch {
      // Ignore unavailable/corrupt browser storage
    }
  }, []);

  function runImport(payload: CandidateData) {
    setStatus(null);
    startTransition(async () => {
      const res = await importBrowserLibraryAction(payload);
      if (res.ok) {
        setStatus({
          kind: "ok",
          text: `${res.message} (${res.data.unmappedCount} item tidak cocok dilewati). Cadangan lokal di browser tetap dipertahankan.`,
        });
        router.refresh();
      } else {
        setStatus({ kind: "error", text: res.error });
      }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCandidate(JSON.parse(String(reader.result ?? "")));
        if (!parsed) {
          setStatus({
            kind: "error",
            text: "Berkas JSON tidak berisi bookmark, antrean, atau riwayat yang valid.",
          });
          setFileCandidate(null);
        } else {
          setFileCandidate(parsed);
        }
      } catch {
        setStatus({ kind: "error", text: "Berkas bukan JSON yang valid." });
        setFileCandidate(null);
      }
    };
    reader.readAsText(file);
  }

  if (localCandidate) {
    return (
      <section className="surface side import-panel" aria-labelledby="import-browser-heading">
        <div className="import-head">
          <div>
            <h2 id="import-browser-heading" style={{ fontSize: 16, marginBottom: 4 }}>
              Data browser lama terdeteksi
            </h2>
            <p className="meta" style={{ margin: 0 }}>
              Ditemukan <strong className="num">{localCandidate.bookmarks.length}</strong> bookmark,{" "}
              <strong className="num">{localCandidate.queue.length}</strong> antrean, dan{" "}
              <strong className="num">{localCandidate.history.length}</strong> riwayat pada browser ini.
              Cadangan lokal tidak dihapus otomatis.
            </p>
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => runImport(localCandidate)}
            disabled={isPending}
          >
            {isPending ? "Mengimpor..." : "Setujui & Impor ke Akun Saya"}
          </button>
        </div>

        {status && (
          <div
            className={`alert ${status.kind === "ok" ? "ok" : "error"}`}
            role="status"
            style={{ marginTop: 12, marginBottom: 0 }}
          >
            {status.text}
          </div>
        )}
      </section>
    );
  }

  return (
    <details className="surface import-disclosure">
      <summary className="import-summary">
        <div>
          <strong id="import-browser-heading">Impor data browser lama / berkas JSON (opsional)</strong>
          <span className="meta">
            Pindahkan bookmark, antrean, dan riwayat dari berkas ekspor JSON lintas origin.
          </span>
        </div>
      </summary>
      <div className="import-body">
        {status && (
          <div
            className={`alert ${status.kind === "ok" ? "ok" : "error"}`}
            role="status"
          >
            {status.text}
          </div>
        )}
        <p className="meta">
          Cookie dan token tidak pernah diimpor, dan cadangan lokal tidak dihapus otomatis.
        </p>
        <div className="stack">
          <label>
            Unggah berkas JSON ekspor (<code>shinigami-lab-v1</code>)
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
            />
          </label>
          {fileCandidate && (
            <div className="actions">
              <span className="meta">
                Siap diimpor: {fileCandidate.bookmarks.length} bookmark,{" "}
                {fileCandidate.queue.length} antrean,{" "}
                {fileCandidate.history.length} riwayat.
              </span>
              <button
                type="button"
                className="primary"
                onClick={() => runImport(fileCandidate)}
                disabled={isPending}
              >
                {isPending ? "Mengimpor..." : "Setujui & Impor Berkas JSON"}
              </button>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
