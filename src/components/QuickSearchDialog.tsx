"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";

interface QuickItem {
  publicId: string;
  title: string;
  type: string;
}

export function QuickSearchDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function runSearch(q: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/catalog/search?q=${encodeURIComponent(q.trim())}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { results?: QuickItem[] };
        setResults(data.results ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!dialogRef.current?.open) return;
    const handle = setTimeout(() => {
      void runSearch(query);
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  function openDialog() {
    dialogRef.current?.showModal();
    void runSearch(query);
  }

  return (
    <>
      <button
        type="button"
        className="icon"
        onClick={openDialog}
        aria-label="Cari"
      >
        <Icon name="search" size={18} />
      </button>

      <dialog ref={dialogRef} id="search" aria-labelledby="search-title">
        <div className="dialog-heading">
          <h2 id="search-title">Cari komik</h2>
          <button
            type="button"
            className="icon"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup pencarian"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <form action="/series" onSubmit={() => dialogRef.current?.close()}>
          <label className="sr-only" htmlFor="quick-search">
            Judul komik
          </label>
          <input
            type="search"
            name="q"
            id="quick-search"
            maxLength={100}
            placeholder="Masukkan judul"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div id="search-results" className="stack" aria-live="polite">
          {loading ? (
            <p className="meta">Mencari...</p>
          ) : results.length > 0 ? (
            results.map((item) => (
              <Link
                key={item.publicId}
                className="row"
                href={`/series/${item.publicId}`}
                onClick={() => dialogRef.current?.close()}
              >
                <strong>{item.title}</strong>
                <span>{item.type}</span>
                <Icon name="chevRight" />
              </Link>
            ))
          ) : (
            <p className="meta">Tidak ada komik yang cocok.</p>
          )}
        </div>
      </dialog>
    </>
  );
}
