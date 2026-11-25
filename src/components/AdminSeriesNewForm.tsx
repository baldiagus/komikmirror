"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSeriesAction } from "@/actions/admin";
import { ALL_GENRES, PUBLICATION_STATUSES, SERIES_TYPES } from "@/lib/validation";

export function AdminSeriesNewForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createSeriesAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/admin/series/${res.data.id}`);
      router.refresh();
    });
  }

  return (
    <form className="surface side stack" onSubmit={onSubmit}>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <label>
        Judul seri
        <input name="title" required maxLength={255} placeholder="Contoh: Pedang Senja" />
      </label>
      <label>
        Slug (opsional, otomatis dari judul)
        <input
          name="slug"
          maxLength={160}
          pattern="[a-z0-9-]*"
          placeholder="pedang-senja"
        />
      </label>
      <div className="two-col">
        <label>
          Jenis
          <select name="type" defaultValue="Manhwa">
            {SERIES_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Genre utama
          <select name="genre" defaultValue="Action">
            {ALL_GENRES.map((g) => (
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
          <select name="publicationStatus" defaultValue="Ongoing">
            {PUBLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rating (0.0 – 10.0)
          <input name="rating" defaultValue="0.0" pattern="^(10(\.0)?|[0-9](\.\d)?)$" />
        </label>
      </div>
      <label>
        Sinopsis
        <textarea name="summary" maxLength={5000} placeholder="Ringkasan cerita..." />
      </label>
      <div className="actions">
        <button className="primary" type="submit" disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan sebagai Draft"}
        </button>
      </div>
    </form>
  );
}
