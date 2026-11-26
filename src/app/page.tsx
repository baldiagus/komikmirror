import React from "react";
import Link from "next/link";
import {
  HeroCarousel,
  ProjectGrid,
  RankRail,
} from "@/components/HomeInteractive";
import { getHomeData } from "@/dal/catalog";
import { getContinueReadingList } from "@/dal/library";
import { getSessionUser } from "@/lib/session";
import { SERIES_TYPES } from "@/lib/validation";

export const dynamic = "force-dynamic";

const RANK_GROUPS = [
  "Rekomendasi",
  "Rank harian",
  "Rank mingguan",
  "Rank sepanjang waktu",
];

function buildHomeQuery(
  rank: number,
  jenis: number,
  hash: string,
): string {
  const params = new URLSearchParams();
  if (rank) params.set("rank", String(rank));
  if (jenis) params.set("jenis", String(jenis));
  const qs = params.toString();
  return qs ? `/?${qs}${hash}` : `/${hash}`;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ rank?: string; jenis?: string }>;
}) {
  const params = await searchParams;
  const rankIdx = Number(params.rank ?? "0");
  const jenisIdx = Number(params.jenis ?? "0");
  const [data, viewer] = await Promise.all([
    getHomeData(
      Number.isInteger(rankIdx) ? rankIdx : 0,
      Number.isInteger(jenisIdx) ? jenisIdx : 0,
    ),
    getSessionUser(),
  ]);
  const continueItems = viewer ? await getContinueReadingList(viewer.id, 6) : [];

  return (
    <main id="main" className="home" tabIndex={-1}>
      <h1 className="sr-only">Beranda</h1>

      <HeroCarousel items={data.hero} />

      <section className="rank-section">
        <h2 className="sr-only">Peringkat komik</h2>
        <nav className="tabs" aria-label="Tampilan peringkat">
          {RANK_GROUPS.map((label, i) => (
            <Link
              key={label}
              className={`chip${i === data.rankTab ? " selected" : ""}`}
              aria-current={i === data.rankTab ? "page" : undefined}
              href={buildHomeQuery(i, data.jenisTab, "#rank")}
            >
              {label}
            </Link>
          ))}
        </nav>
        {data.ranked.length > 0 ? (
          <RankRail items={data.ranked} />
        ) : (
          <section className="empty surface">
            <h2>Belum ada katalog terbit</h2>
            <p className="meta">
              Jalankan impor snapshot atau terbitkan seri melalui panel admin.
            </p>
          </section>
        )}
      </section>

      {continueItems.length > 0 && (
        <section className="continue-section" aria-label="Lanjut membaca">
          <div className="section-heading">
            <h2>Lanjut Membaca</h2>
            <Link className="meta" href="/library?tab=history">
              Lihat riwayat
            </Link>
          </div>
          <div className="continue-grid">
            {continueItems.map((item) => (
              <Link
                key={item.seriesId}
                className="surface continue-card"
                href={`/chapter/${item.chapterPublicId}`}
              >
                <img
                  className="cover"
                  src={item.coverSrc}
                  alt=""
                  width={120}
                  height={180}
                  loading="lazy"
                />
                <div className="continue-body">
                  <strong>{item.seriesTitle}</strong>
                  <span className="meta num">
                    Lanjut Ch. {item.chapterNumber}
                    {item.latestChapterNumber &&
                    item.latestChapterNumber !== item.chapterNumber
                      ? ` / ${item.latestChapterNumber}`
                      : ""}
                  </span>
                  <small className="meta num">{item.readAt}</small>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="project">
        <div className="section-heading">
          <h2>Project</h2>
          <nav className="tabs" aria-label="Filter jenis komik">
            {["Semua", ...SERIES_TYPES].map((label, i) => (
              <Link
                key={label}
                className={`chip${i === data.jenisTab ? " selected" : ""}`}
                aria-current={i === data.jenisTab ? "page" : undefined}
                href={buildHomeQuery(data.rankTab, i, "#project")}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <ProjectGrid
          initialItems={data.project}
          totalCount={data.totalProjectCount}
          jenisTab={data.jenisTab}
        />
      </section>
    </main>
  );
}
