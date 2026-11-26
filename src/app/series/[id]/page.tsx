import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
import { Icon } from "@/components/Icons";
import { SeriesActions } from "@/components/SeriesActions";
import { getActiveAdForSlot } from "@/dal/ads";
import { getSeriesDetail } from "@/dal/catalog";
import { getUserSeriesFlags, getUserSeriesReadState } from "@/dal/library";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function buildPageWindow(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default async function SeriesDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; order?: string; ch?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const viewer = await getSessionUser();
  const comic = await getSeriesDetail(id, viewer, {
    page: query.page,
    order: query.order,
    q: query.ch,
  });
  if (!comic) notFound();

  const [flags, readState, seriesMidAd] = await Promise.all([
    viewer
      ? getUserSeriesFlags(viewer.id, comic.id)
      : Promise.resolve({ bookmarked: false, queued: false }),
    viewer
      ? getUserSeriesReadState(viewer.id, comic.id)
      : Promise.resolve({ readChapterIds: [], lastReadChapter: null }),
    getActiveAdForSlot("series_mid", viewer),
  ]);
  const readChapterSet = new Set(readState.readChapterIds);

  const baseHref = `/series/${comic.publicId}`;
  const makeChapterHref = (next: {
    page?: number;
    order?: "desc" | "asc";
    ch?: string;
  }) => {
    const qs = new URLSearchParams();
    const order = next.order ?? comic.chapterOrder;
    const ch = next.ch !== undefined ? next.ch : comic.chapterQuery;
    const page = next.page ?? 1;
    if (order !== "desc") qs.set("order", order);
    if (ch) qs.set("ch", ch);
    if (page > 1) qs.set("page", String(page));
    const str = qs.toString();
    return str ? `${baseHref}?${str}#chapters` : `${baseHref}#chapters`;
  };

  const rangeStart =
    comic.totalChapters === 0
      ? 0
      : (comic.chapterPage - 1) * comic.chapterPageSize + 1;
  const rangeEnd = Math.min(
    comic.totalChapters,
    comic.chapterPage * comic.chapterPageSize,
  );
  const pageWindow = buildPageWindow(comic.chapterPage, comic.chapterTotalPages);

  return (
    <main id="main" className="page" tabIndex={-1}>
      <div className="return">
        <Link className="chip" href="/series">
          <Icon name="chevLeft" /> Daftar Komik
        </Link>
      </div>

      {comic.status !== "published" && (
        <div className="alert warn" role="status">
          Pratinjau admin: seri ini berstatus <strong>{comic.status}</strong>{" "}
          dan tidak tampil bagi pengunjung publik.
        </div>
      )}

      <section className="series-intro surface">
        <img
          className="cover series-intro-cover"
          src={comic.coverSrc}
          alt={comic.title}
          width={300}
          height={450}
        />
        <div className="series-intro-head">
          <p className="meta">
            {comic.type} · {comic.genre} · {comic.publicationStatus}
            {comic.rating > 0 ? ` · ${comic.rating.toFixed(1)}` : ""}
          </p>
          <h1 className="page-title">{comic.title}</h1>
        </div>
        <div className="series-intro-body">
          <p className="series-summary">
            {comic.summary || "Belum ada sinopsis."}
          </p>

          <SeriesActions
            seriesId={comic.id}
            firstChapterPublicId={comic.firstChapterPublicId}
            continueChapter={readState.lastReadChapter}
            signedIn={Boolean(viewer)}
            initialBookmarked={flags.bookmarked}
            initialQueued={flags.queued}
          />
        </div>
      </section>

      <AdSlot ad={seriesMidAd} />

      <section id="chapters">
        <div className="section-heading">
          <div>
            <h2>Daftar Chapter</h2>
            <p className="meta num" style={{ margin: "4px 0 0" }}>
              {comic.totalChapters > 0
                ? `Menampilkan ${rangeStart}–${rangeEnd} dari ${comic.totalChapters.toLocaleString("id-ID")} chapter`
                : "0 chapter"}
            </p>
          </div>
          <div className="tabs" role="group" aria-label="Urutan chapter">
            <Link
              className={`chip${comic.chapterOrder === "desc" ? " selected" : ""}`}
              href={makeChapterHref({ order: "desc", page: 1 })}
            >
              Terbaru
            </Link>
            <Link
              className={`chip${comic.chapterOrder === "asc" ? " selected" : ""}`}
              href={makeChapterHref({ order: "asc", page: 1 })}
            >
              Terlama
            </Link>
          </div>
        </div>

        <form className="chapter-toolbar" action={`${baseHref}#chapters`}>
          <label className="sr-only" htmlFor="chapter-search">
            Cari nomor atau judul chapter
          </label>
          <input
            id="chapter-search"
            name="ch"
            type="search"
            defaultValue={comic.chapterQuery}
            placeholder="Cari chapter (cth: 120)..."
          />
          {comic.chapterOrder !== "desc" && (
            <input type="hidden" name="order" value={comic.chapterOrder} />
          )}
          <button type="submit" className="chip">
            Cari
          </button>
          {comic.chapterQuery && (
            <Link
              className="chip"
              href={makeChapterHref({ ch: "", page: 1 })}
            >
              Reset
            </Link>
          )}
        </form>

        {comic.chapters.length > 0 ? (
          <>
            <div className="stack">
              {comic.chapters.map((ch) => {
                const customTitle =
                  ch.title && ch.title !== `Chapter ${ch.number}`
                    ? ch.title
                    : null;
                const isRead = readChapterSet.has(ch.id);
                return (
                  <Link
                    key={ch.id}
                    className={`row chapter-row${isRead ? " is-read" : ""}`}
                    href={`/chapter/${ch.publicId}`}
                  >
                    <div className="chapter-row-main">
                      <strong className="num">
                        Chapter {ch.number}
                        {ch.status !== "published" && (
                          <>
                            {" "}
                            <span className={`status-pill ${ch.status}`}>
                              {ch.status}
                            </span>
                          </>
                        )}
                      </strong>
                      {isRead && <span className="read-badge">Dibaca</span>}
                      {customTitle && (
                        <span className="chapter-row-sub">{customTitle}</span>
                      )}
                    </div>
                    <div className="chapter-row-meta">
                      <span className="meta num">{ch.updatedAt}</span>
                      <Icon name="chevRight" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {comic.chapterTotalPages > 1 && (
              <nav
                className="pagination"
                aria-label="Navigasi halaman chapter"
              >
                {comic.chapterPage > 1 ? (
                  <Link
                    className="chip"
                    href={makeChapterHref({ page: comic.chapterPage - 1 })}
                  >
                    <Icon name="chevLeft" /> Sebelumnya
                  </Link>
                ) : (
                  <span className="chip page-disabled" aria-disabled="true">
                    <Icon name="chevLeft" /> Sebelumnya
                  </span>
                )}

                <div className="pagination-pages">
                  {pageWindow.map((item, idx) =>
                    item === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="page-ellipsis"
                        aria-hidden="true"
                      >
                        …
                      </span>
                    ) : item === comic.chapterPage ? (
                      <span
                        key={item}
                        className="primary page-btn num"
                        aria-current="page"
                      >
                        {item}
                      </span>
                    ) : (
                      <Link
                        key={item}
                        className="chip page-btn num"
                        href={makeChapterHref({ page: item })}
                      >
                        {item}
                      </Link>
                    ),
                  )}
                </div>

                {comic.chapterPage < comic.chapterTotalPages ? (
                  <Link
                    className="chip"
                    href={makeChapterHref({ page: comic.chapterPage + 1 })}
                  >
                    Berikutnya <Icon name="chevRight" />
                  </Link>
                ) : (
                  <span className="chip page-disabled" aria-disabled="true">
                    Berikutnya <Icon name="chevRight" />
                  </span>
                )}
              </nav>
            )}
          </>
        ) : (
          <section className="empty surface">
            <h3>
              {comic.chapterQuery
                ? `Chapter "${comic.chapterQuery}" tidak ditemukan`
                : "Belum ada chapter terbit"}
            </h3>
            <p className="meta">
              {comic.chapterQuery
                ? "Coba cari nomor chapter lain atau reset filter."
                : "Chapter untuk seri ini belum tersedia di katalog publik."}
            </p>
            {comic.chapterQuery && (
              <Link
                className="primary"
                href={makeChapterHref({ ch: "", page: 1 })}
              >
                Tampilkan semua chapter
              </Link>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
