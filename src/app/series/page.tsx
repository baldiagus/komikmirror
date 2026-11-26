import React from "react";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { CatalogSortSelect } from "@/components/CatalogSortSelect";
import { Icon } from "@/components/Icons";
import { getActiveAdForSlot } from "@/dal/ads";
import { listPublishedCatalog } from "@/dal/catalog";
import { getSessionUser } from "@/lib/session";
import { PUBLICATION_STATUSES, SERIES_TYPES } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daftar Komik" };

interface CatalogFilterState {
  q: string;
  type: string;
  genre: string;
  status: string;
  sort: string;
}

function buildCatalogUrl(
  filter: CatalogFilterState,
  page: number,
  overrides?: Partial<CatalogFilterState>,
): string {
  const next = { ...filter, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.type) params.set("type", next.type);
  if (next.genre) params.set("genre", next.genre);
  if (next.status) params.set("status", next.status);
  if (next.sort) params.set("sort", next.sort);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/series?${qs}` : "/series";
}

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

export default async function SeriesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    genre?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const [data, viewer] = await Promise.all([
    listPublishedCatalog(params),
    getSessionUser(),
  ]);
  const catalogTopAd = await getActiveAdForSlot("catalog_top", viewer);

  const activeFilterCount = [
    data.filter.type,
    data.filter.genre,
    data.filter.status,
  ].filter(Boolean).length;

  const activeChips: { label: string; clearHref: string }[] = [];
  if (data.filter.q) {
    activeChips.push({
      label: `Cari: "${data.filter.q}"`,
      clearHref: buildCatalogUrl(data.filter, 1, { q: "" }),
    });
  }
  if (data.filter.type) {
    activeChips.push({
      label: `Jenis: ${data.filter.type}`,
      clearHref: buildCatalogUrl(data.filter, 1, { type: "" }),
    });
  }
  if (data.filter.status) {
    activeChips.push({
      label: `Status: ${data.filter.status}`,
      clearHref: buildCatalogUrl(data.filter, 1, { status: "" }),
    });
  }
  if (data.filter.genre) {
    activeChips.push({
      label: `Genre: ${data.filter.genre}`,
      clearHref: buildCatalogUrl(data.filter, 1, { genre: "" }),
    });
  }

  const rangeStart =
    data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const rangeEnd = Math.min(data.total, data.page * data.pageSize);
  const pageWindow = buildPageWindow(data.page, data.totalPages);

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
          placeholder="Cari judul komik..."
        />

        <details className="filter-pop">
          <summary className="chip">
            Filter
            {activeFilterCount > 0 && (
              <span className="filter-badge num">{activeFilterCount}</span>
            )}
          </summary>
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
              Status rilis
              <select name="status" defaultValue={data.filter.status}>
                <option value="">Semua status</option>
                {PUBLICATION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
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

      {activeChips.length > 0 && (
        <div className="active-filters" aria-label="Filter aktif">
          {activeChips.map((chip) => (
            <Link key={chip.label} className="chip filter-chip" href={chip.clearHref}>
              <span>{chip.label}</span>
              <Icon name="close" size={13} />
            </Link>
          ))}
          {activeChips.length > 1 && (
            <Link
              className="meta"
              href={buildCatalogUrl(data.filter, 1, {
                q: "",
                type: "",
                status: "",
                genre: "",
              })}
            >
              Reset semua
            </Link>
          )}
        </div>
      )}

      <p className="meta num">
        {data.total > 0
          ? `Menampilkan ${rangeStart.toLocaleString("id-ID")}–${rangeEnd.toLocaleString("id-ID")} dari ${data.total.toLocaleString("id-ID")} komik`
          : "0 komik"}
      </p>

      <AdSlot ad={catalogTopAd} />

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
            <nav className="pagination" aria-label="Halaman katalog">
              {data.page > 1 ? (
                <Link
                  className="chip"
                  href={buildCatalogUrl(data.filter, data.page - 1)}
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
                  ) : item === data.page ? (
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
                      href={buildCatalogUrl(data.filter, item)}
                    >
                      {item}
                    </Link>
                  ),
                )}
              </div>

              {data.page < data.totalPages ? (
                <Link
                  className="chip"
                  href={buildCatalogUrl(data.filter, data.page + 1)}
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
