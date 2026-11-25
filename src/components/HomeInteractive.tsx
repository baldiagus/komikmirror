"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SeriesCardDTO } from "@/dal/catalog";
import { Icon } from "@/components/Icons";

export function HeroCarousel({ items }: { items: SeriesCardDTO[] }) {
  const [slides, setSlides] = useState(items);

  useEffect(() => {
    setSlides(items);
  }, [items]);

  if (slides.length === 0) return null;

  const featuredIdx = Math.min(3, Math.floor(slides.length / 2));

  function move(step: number) {
    setSlides((prev) => {
      if (prev.length < 2) return prev;
      if (step > 0) return [...prev.slice(1), prev[0]];
      return [prev[prev.length - 1], ...prev.slice(0, -1)];
    });
  }

  return (
    <section className="hero" aria-label="Komik unggulan">
      <div className="hero-track">
        {slides.map((comic, i) => (
          <Link
            key={comic.id}
            className={`hero-cover${i === featuredIdx ? " featured" : ""}`}
            href={`/series/${comic.publicId}`}
            aria-label={`${comic.title}${comic.rating > 0 ? `, rating ${comic.rating.toFixed(1)}` : ""}`}
          >
            <img
              className="cover"
              src={comic.coverSrc}
              alt=""
              width={300}
              height={450}
            />
            {comic.rating > 0 && (
              <span className="rating">
                <Icon name="star" size={12} /> {comic.rating.toFixed(1)}
              </span>
            )}
            <strong>{comic.title}</strong>
          </Link>
        ))}
      </div>
      <button
        type="button"
        className="hero-arrow prev"
        onClick={() => move(-1)}
        aria-label="Unggulan sebelumnya"
      >
        <Icon name="chevLeft" />
      </button>
      <button
        type="button"
        className="hero-arrow next"
        onClick={() => move(1)}
        aria-label="Unggulan berikutnya"
      >
        <Icon name="chevRight" />
      </button>
    </section>
  );
}

export function RankRail({ items }: { items: SeriesCardDTO[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollRail(dir: number) {
    trackRef.current?.scrollBy({ left: dir * 372, behavior: "auto" });
  }

  return (
    <>
      <div
        ref={trackRef}
        id="rank"
        className="rank-track"
        tabIndex={0}
        aria-label="Daftar peringkat"
      >
        {items.map((comic, i) => (
          <Link
            key={comic.id}
            className="rank-card"
            href={`/series/${comic.publicId}`}
          >
            <img
              className="cover"
              src={comic.coverSrc}
              alt=""
              width={300}
              height={450}
              loading="lazy"
            />
            <div className="rank-meta">
              <b className={i === 0 ? "points" : ""}>{i + 1}</b>
              <div>
                <strong>{comic.title}</strong>
                <small>
                  Ch. {comic.latestChapterNumber ?? "—"} · {comic.updatedLabel}
                </small>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="rail-actions">
        <button
          type="button"
          onClick={() => scrollRail(-1)}
          aria-label="Peringkat sebelumnya"
        >
          <Icon name="chevLeft" />
        </button>
        <button
          type="button"
          onClick={() => scrollRail(1)}
          aria-label="Peringkat berikutnya"
        >
          <Icon name="chevRight" />
        </button>
      </div>
    </>
  );
}

export function ProjectGrid({
  initialItems,
  totalCount,
  jenisTab,
}: {
  initialItems: SeriesCardDTO[];
  totalCount: number;
  jenisTab: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    setItems(initialItems);
    setTotal(totalCount);
    setAnnouncement("");
  }, [initialItems, totalCount, jenisTab]);

  async function loadMore() {
    if (loading || items.length >= total) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/catalog/project?jenis=${jenisTab}&offset=${items.length}&limit=20`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: SeriesCardDTO[];
        total: number;
      };
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const next = [...prev, ...data.items.filter((x) => !seen.has(x.id))];
        setAnnouncement(`Menampilkan ${next.length} dari ${data.total} komik.`);
        return next;
      });
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid" data-project-grid>
        {items.map((comic) => (
          <article key={comic.id} className="surface tile">
            <Link href={`/series/${comic.publicId}`}>
              <img
                className="cover"
                src={comic.coverSrc}
                alt=""
                width={300}
                height={450}
                loading="lazy"
              />
              <h3>{comic.title}</h3>
            </Link>
            <div className="chapter-pills">
              {comic.latestChapters.length > 0 ? (
                comic.latestChapters.map((ch) => (
                  <Link
                    key={ch.id}
                    className="chip"
                    href={`/chapter/${ch.publicId}`}
                  >
                    <span className="num">Chapter {ch.number}</span>
                    <small className="meta num">{comic.updatedLabel}</small>
                  </Link>
                ))
              ) : (
                <span className="meta">Belum ada chapter terbit</span>
              )}
            </div>
          </article>
        ))}
      </div>
      {items.length < total && (
        <div className="load-more">
          <button
            type="button"
            data-load-more
            data-jenis={jenisTab}
            data-shown={items.length}
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Memuat..." : "Muat lainnya"}
          </button>
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </>
  );
}
