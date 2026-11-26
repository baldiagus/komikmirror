"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import type { PanelDTO } from "@/dal/catalog";
import {
  ensureGsapRegistered,
  gsap,
  prefersReducedMotion,
  ScrollTrigger,
  useGSAP,
} from "@/lib/gsap";

ensureGsapRegistered();

type WidthMode = "compact" | "wide" | "full";

const WIDTH_LABELS: Record<WidthMode, string> = {
  compact: "640px",
  wide: "860px",
  full: "Penuh",
};

const WIDTH_CYCLE: WidthMode[] = ["compact", "wide", "full"];
const WIDTH_STORAGE_KEY = "komik-reader-width";

function PanelImage({ panel, index }: { panel: PanelDTO; index: number }) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  const src =
    retry === 0
      ? panel.url
      : `${panel.url}${panel.url.includes("?") ? "&" : "?"}retry=${retry}`;

  if (failed) {
    return (
      <figure className="panel-fallback">
        <p className="meta" style={{ margin: 0 }}>
          Halaman {index + 1} gagal dimuat.
        </p>
        <button
          type="button"
          className="chip"
          onClick={() => {
            setFailed(false);
            setRetry((n) => n + 1);
          }}
        >
          Muat ulang panel
        </button>
      </figure>
    );
  }

  return (
    <figure>
      <img
        key={`${panel.id}-${retry}`}
        src={src}
        alt={`Halaman ${index + 1}`}
        width={panel.width ?? undefined}
        height={panel.height ?? undefined}
        referrerPolicy={panel.isRemote ? "no-referrer" : undefined}
        loading={index < 2 ? "eager" : "lazy"}
        onError={() => setFailed(true)}
      />
    </figure>
  );
}

export function ChapterReaderClient({
  seriesPublicId,
  seriesTitle,
  heading,
  currentChapterPublicId,
  isPreview,
  panels,
  prevChapter,
  nextChapter,
  allChapters,
}: {
  seriesPublicId: string;
  seriesTitle: string;
  heading: string;
  currentChapterPublicId: string;
  isPreview: boolean;
  panels: PanelDTO[];
  prevChapter: { publicId: string; number: string; title: string } | null;
  nextChapter: { publicId: string; number: string; title: string } | null;
  allChapters: { publicId: string; number: string; title: string }[];
}) {
  const router = useRouter();
  const [widthMode, setWidthMode] = useState<WidthMode>("compact");
  const [progress, setProgress] = useState(0);
  const [barCollapsed, setBarCollapsed] = useState(false);
  const floatBarRef = useRef<HTMLElement>(null);
  const hiddenByScrollRef = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WIDTH_STORAGE_KEY);
      if (saved === "compact" || saved === "wide" || saved === "full") {
        setWidthMode(saved);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // GSAP ScrollTrigger: track progress & smoothly auto-hide floating bar when reading downward
  useGSAP(
    () => {
      const bar = floatBarRef.current;
      if (!bar) return;

      const setBarHidden = (hide: boolean) => {
        if (hiddenByScrollRef.current === hide) return;
        hiddenByScrollRef.current = hide;
        if (prefersReducedMotion()) {
          gsap.set(bar, {
            yPercent: hide ? 130 : 0,
            autoAlpha: hide ? 0 : 1,
          });
          return;
        }
        gsap.to(bar, {
          yPercent: hide ? 130 : 0,
          autoAlpha: hide ? 0 : 1,
          duration: hide ? 0.28 : 0.24,
          ease: hide ? "power2.out" : "power3.out",
          overwrite: "auto",
        });
      };

      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate(self) {
          const doc = document.documentElement;
          const scrollable = doc.scrollHeight - window.innerHeight;
          const pct =
            scrollable <= 0
              ? 100
              : Math.max(
                  0,
                  Math.min(100, Math.round((window.scrollY / scrollable) * 100)),
                );
          setProgress(pct);

          const nearTop = window.scrollY <= 180;
          const nearBottom = scrollable - window.scrollY <= 180;
          if (nearTop || nearBottom || self.direction === -1) {
            setBarHidden(false);
          } else if (self.direction === 1 && window.scrollY > 180) {
            setBarHidden(true);
          }
        },
      });

      // Initialize progress on mount
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      setProgress(
        scrollable <= 0
          ? 100
          : Math.max(
              0,
              Math.min(100, Math.round((window.scrollY / scrollable) * 100)),
            ),
      );

      return () => {
        st.kill();
      };
    },
    { dependencies: [currentChapterPublicId] },
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" && prevChapter) {
        e.preventDefault();
        router.push(`/chapter/${prevChapter.publicId}`);
      } else if (e.key === "ArrowRight" && nextChapter) {
        e.preventDefault();
        router.push(`/chapter/${nextChapter.publicId}`);
      } else if (e.key === "t" || e.key === "T") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prevChapter, nextChapter, router]);

  function cycleWidth() {
    const next =
      WIDTH_CYCLE[(WIDTH_CYCLE.indexOf(widthMode) + 1) % WIDTH_CYCLE.length];
    setWidthMode(next);
    try {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, next);
    } catch {
      // Ignore
    }
  }

  const renderNav = () => (
    <nav className="actions chapter-nav" aria-label="Pindah chapter">
      {prevChapter && (
        <Link className="chip" href={`/chapter/${prevChapter.publicId}`}>
          <Icon name="chevLeft" /> Sebelumnya (Ch. {prevChapter.number})
        </Link>
      )}
      <Link className="chip" href={`/series/${seriesPublicId}`}>
        Daftar Chapter
      </Link>
      {nextChapter && (
        <Link className="primary" href={`/chapter/${nextChapter.publicId}`}>
          Berikutnya (Ch. {nextChapter.number}) <Icon name="chevRight" />
        </Link>
      )}
    </nav>
  );

  const readerClass =
    widthMode === "wide"
      ? "reader reader-wide"
      : widthMode === "full"
        ? "reader reader-full"
        : "reader";

  return (
    <>
      <article className={readerClass}>
        <p className="meta">
          <Link className="chip" href={`/series/${seriesPublicId}`}>
            {seriesTitle}
          </Link>
        </p>

        {isPreview && (
          <div className="alert warn" role="status">
            Pratinjau admin: chapter ini belum diterbitkan untuk publik.
          </div>
        )}

        <h1 className="page-title">{heading}</h1>
        {renderNav()}

        {panels.length > 0 ? (
          <div id="chapter-panels" className="panels">
            {panels.map((panel, idx) => (
              <PanelImage key={panel.id} panel={panel} index={idx} />
            ))}
          </div>
        ) : (
          <section
            id="chapter-panels-empty"
            className="empty surface"
            style={{ marginBlock: 16 }}
          >
            <h2>Panel belum tersedia</h2>
            <p className="meta">
              Chapter ini terdaftar di katalog, tetapi belum memiliki berkas
              panel gambar yang diunggah.
            </p>
          </section>
        )}

        {renderNav()}
      </article>

      <aside
        ref={floatBarRef}
        className={`reader-float${barCollapsed ? " collapsed" : ""}`}
        aria-label="Kontrol baca cepat"
      >
        {barCollapsed ? (
          <button
            type="button"
            className="chip"
            onClick={() => setBarCollapsed(false)}
            aria-label="Tampilkan bilah baca"
          >
            <span className="num">{progress}%</span> · Kontrol
          </button>
        ) : (
          <div className="reader-float-inner">
            {prevChapter ? (
              <Link
                className="chip reader-float-icon"
                href={`/chapter/${prevChapter.publicId}`}
                aria-label={`Chapter sebelumnya (${prevChapter.number})`}
                title={`Sebelumnya (Ch. ${prevChapter.number}) [←]`}
              >
                <Icon name="chevLeft" />
              </Link>
            ) : (
              <span
                className="chip reader-float-icon page-disabled"
                aria-disabled="true"
              >
                <Icon name="chevLeft" />
              </span>
            )}

            {allChapters.length > 0 && (
              <label className="reader-float-select">
                <span className="sr-only">Pilih chapter</span>
                <select
                  aria-label="Pilih chapter"
                  value={currentChapterPublicId}
                  onChange={(e) => {
                    if (e.target.value) {
                      router.push(`/chapter/${e.target.value}`);
                    }
                  }}
                >
                  {allChapters.map((ch) => (
                    <option key={ch.publicId} value={ch.publicId}>
                      Ch. {ch.number}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {nextChapter ? (
              <Link
                className="chip reader-float-icon"
                href={`/chapter/${nextChapter.publicId}`}
                aria-label={`Chapter berikutnya (${nextChapter.number})`}
                title={`Berikutnya (Ch. ${nextChapter.number}) [→]`}
              >
                <Icon name="chevRight" />
              </Link>
            ) : (
              <span
                className="chip reader-float-icon page-disabled"
                aria-disabled="true"
              >
                <Icon name="chevRight" />
              </span>
            )}

            <button
              type="button"
              className="chip reader-float-width"
              onClick={cycleWidth}
              title="Ubah lebar panel pembaca"
            >
              {WIDTH_LABELS[widthMode]}
            </button>

            <button
              type="button"
              className="chip num"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Kembali ke atas"
              title="Kembali ke atas [T]"
            >
              ↑ {progress}%
            </button>

            <button
              type="button"
              className="chip reader-float-icon"
              onClick={() => setBarCollapsed(true)}
              aria-label="Sembunyikan bilah baca"
              title="Sembunyikan"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
