import React from "react";
import Link from "next/link";
import {
  HeroCarousel,
  ProjectGrid,
  RankRail,
} from "@/components/HomeInteractive";
import { getHomeData } from "@/dal/catalog";
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
  const data = await getHomeData(
    Number.isInteger(rankIdx) ? rankIdx : 0,
    Number.isInteger(jenisIdx) ? jenisIdx : 0,
  );

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
