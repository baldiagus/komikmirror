import React from "react";
import Link from "next/link";
import { CatalogSortSelect } from "@/components/CatalogSortSelect";
import { Icon } from "@/components/Icons";
import { listPublishedCatalog } from "@/dal/catalog";
import { SERIES_TYPES } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daftar Komik" };

function buildCatalogUrl(
  filter: { q: string; type: string; genre: string; sort: string },
  page: number,
): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.type) params.set("type", filter.type);
  if (filter.genre) params.set("genre", filter.genre);
  if (filter.sort) params.set("sort", filter.sort);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/series?${qs}` : "/series";
}

export default async function SeriesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    genre?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const data = await listPublishedCatalog(params);

  return (
    <main id="main" className="page" tabIndex={-1}>
      <h1 className="page-title">Daftar Komik</h1>

      <form className="series-toolbar" action="/series">
        <label className="sr-only" htmlFor="series-q">
          Cari judul manga
        </label>
        <input
          id="series-q"
          name="q"
          type="search"
          defaultValue={data.filter.q}
          maxLength={100}
          placeholder="Cari judul manga"
        />

        <details className="filter-pop">
          <summary className="chip">Filter</summary>
          <div className="surface filter-panel">
            <label>
              Jenis
              <select name="type" defaultValue={data.filter.type}>
                <option value="">Semua jenis</option>
                {SERIES_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Genre
              <select name="genre" defaultValue={data.filter.genre}>
                <option value="">Semua genre</option>
                {data.genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <div className="actions">
              <button type="submit" className="primary">
                Terapkan
              </button>
              <Link className="chip" href="/series">
                Reset
              </Link>
            </div>
          </div>
        </details>

        <CatalogSortSelect defaultValue={data.filter.sort} />
      </form>

      <p className="meta num">{data.total.toLocaleString("id-ID")} komik</p>

      {data.items.length > 0 ? (
        <>
          <h2 className="sr-only">Hasil pencarian</h2>
          <div className="series-grid">
            {data.items.map((comic) => (
              <Link
                key={comic.id}
                className="surface series-card"
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
                <div className="series-body">
                  <h3>{comic.title}</h3>
                  <p className="meta">
                    {comic.type} · {comic.publicationStatus}
                  </p>
                  <p className="series-stats">
                    <span className="num">
                      #{comic.rank.toLocaleString("id-ID")}
                    </span>
                    <span className="num">
                      {comic.followers.toLocaleString("id-ID")} pengikut
                    </span>
                    {comic.rating > 0 && (
                      <span className="rate-inline num">
                        <Icon name="star" size={12} /> {comic.rating.toFixed(1)}
                      </span>
                    )}
                  </p>
                  <p className="series-excerpt">{comic.summary}</p>
                  <p className="series-ch">
                    <strong className="points num">
                      Chapter {comic.latestChapterNumber ?? "—"}
                    </strong>{" "}
                    · <span className="meta">{comic.updatedLabel}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {data.totalPages > 1 && (
            <nav className="actions" aria-label="Halaman katalog">
              {data.page > 1 && (
                <Link
                  className="chip"
                  href={buildCatalogUrl(data.filter, data.page - 1)}
                >
                  <Icon name="chevLeft" /> Sebelumnya
                </Link>
              )}
              <span className="meta num">
                Halaman {data.page} dari {data.totalPages}
              </span>
              {data.page < data.totalPages && (
                <Link
                  className="primary"
                  href={buildCatalogUrl(data.filter, data.page + 1)}
                >
                  Berikutnya <Icon name="chevRight" />
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <section className="empty surface">
          <h2>Tidak ada hasil</h2>
          <p>Coba kata kunci atau filter lain.</p>
          <Link className="primary" href="/series">
            Lihat semua komik
          </Link>
        </section>
      )}
    </main>
  );
}
