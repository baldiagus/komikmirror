"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SeriesCardDTO } from "@/dal/catalog";
import { Icon } from "@/components/Icons";
import {
  ensureGsapRegistered,
  Flip,
  gsap,
  prefersReducedMotion,
  useGSAP,
} from "@/lib/gsap";

ensureGsapRegistered();

export function HeroCarousel({ items }: { items: SeriesCardDTO[] }) {
  const [slides, setSlides] = useState(items);
  const heroRef = useRef<HTMLElement>(null);
  const flipStateRef = useRef<Flip.FlipState | null>(null);
  const pointerStartX = useRef<number | null>(null);

  useEffect(() => {
    flipStateRef.current = null;
    setSlides(items);
  }, [items]);

  // Subtle initial entrance (skipped when prefers-reduced-motion is active)
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".hero-cover", {
          y: 12,
          scale: 0.96,
          duration: 0.42,
          stagger: 0.04,
          ease: "power2.out",
          clearProps: "transform",
        });
      });
      return () => mm.revert();
    },
    { scope: heroRef },
  );

  // Smooth Flip transition when carousel slides shift
  useGSAP(
    () => {
      const state = flipStateRef.current;
      if (!state) return;
      flipStateRef.current = null;
      if (prefersReducedMotion()) return;
      Flip.from(state, {
        duration: 0.42,
        ease: "power3.out",
        simple: true,
        prune: true,
        clearProps: "transform",
      });
    },
    { dependencies: [slides], scope: heroRef },
  );

  if (slides.length === 0) return null;

  const featuredIdx = Math.min(3, Math.floor(slides.length / 2));

  function move(step: number) {
    if (heroRef.current && !prefersReducedMotion()) {
      const targets = heroRef.current.querySelectorAll(".hero-cover");
      if (targets.length > 0) {
        flipStateRef.current = Flip.getState(targets, { props: "opacity" });
      }
    }
    setSlides((prev) => {
      if (prev.length < 2) return prev;
      if (step > 0) return [...prev.slice(1), prev[0]];
      return [prev[prev.length - 1], ...prev.slice(0, -1)];
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerStartX.current = e.clientX;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLElement>) {
    if (pointerStartX.current === null) return;
    const delta = e.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(delta) >= 48) {
      move(delta < 0 ? 1 : -1);
    }
  }

  return (
    <section
      ref={heroRef}
      className="hero"
      aria-label="Komik unggulan"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStartX.current = null;
      }}
    >
      <div className="hero-track">
        {slides.map((comic, i) => (
          <Link
            key={comic.id}
            data-flip-id={comic.id}
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
              draggable={false}
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
    const el = trackRef.current;
    if (!el) return;
    const target = Math.max(
      0,
      Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + dir * 372),
    );
    if (prefersReducedMotion()) {
      el.scrollLeft = target;
      return;
    }
    gsap.to(el, {
      scrollLeft: target,
      duration: 0.42,
      ease: "power3.out",
      overwrite: "auto",
    });
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
  const gridRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(initialItems.length);

  useEffect(() => {
    setItems(initialItems);
    setTotal(totalCount);
    setAnnouncement("");
    prevCountRef.current = initialItems.length;
  }, [initialItems, totalCount, jenisTab]);

  // Animate newly appended cards when "Muat lainnya" loads another batch
  useGSAP(
    () => {
      const prevCount = prevCountRef.current;
      prevCountRef.current = items.length;
      if (items.length <= prevCount || prefersReducedMotion()) return;
      const allTiles = gridRef.current?.querySelectorAll(".tile");
      if (!allTiles) return;
      const newTiles = Array.from(allTiles).slice(prevCount);
      if (newTiles.length === 0) return;
      gsap.from(newTiles, {
        opacity: 0,
        y: 16,
        duration: 0.36,
        stagger: 0.025,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    },
    { dependencies: [items.length], scope: gridRef },
  );

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
      <div ref={gridRef} className="grid" data-project-grid>
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
                    <small className="meta num">{ch.updatedAt}</small>
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
