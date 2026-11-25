import React from "react";
import Link from "next/link";
import { BrowserImportPanel } from "@/components/BrowserImportPanel";
import { ClearHistoryButton } from "@/components/ClearHistoryButton";
import { Icon } from "@/components/Icons";
import { getUserLibrary } from "@/dal/library";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pustaka" };

const TABS = ["Bookmark", "Riwayat", "Antrean"] as const;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const viewer = await getSessionUser();
  if (!viewer) {
    return (
      <main id="main" className="page" tabIndex={-1}>
        <h1 className="page-title">Pustaka</h1>
        <section className="empty surface">
          <h2>Masuk untuk membuka Pustaka akun Anda</h2>
          <p className="meta">
            Bookmark, antrean baca, dan riwayat tersimpan aman per akun di
            database.
          </p>
          <Link className="primary" href="/login?next=/library">
            Masuk sekarang
          </Link>
        </section>
      </main>
    );
  }

  const params = await searchParams;
  const rawTab = Number(params.tab ?? "0");
  const activeTab = Number.isInteger(rawTab) && rawTab >= 0 && rawTab < 3 ? rawTab : 0;
  const rawFilter = Number(params.filter ?? "0");
  const activeFilter = rawFilter === 1 ? 1 : 0;

  const data = await getUserLibrary(viewer.id, activeFilter);
  const counts = [
    String(data.counts.bookmarks),
    String(data.counts.history),
    `${data.counts.queue}/${data.counts.maxQueue}`,
  ];

  const seriesList = activeTab === 2 ? data.queue : data.bookmarks;

  return (
    <main id="main" className="page" tabIndex={-1}>
      <h1 className="page-title">Pustaka</h1>

      <nav className="seg-tabs" aria-label="Pustaka">
        {TABS.map((label, i) => (
          <Link
            key={label}
            className={`seg-tab${i === activeTab ? " selected" : ""}`}
            aria-current={i === activeTab ? "page" : undefined}
            href={i === 0 ? "/library" : `/library?tab=${i}`}
          >
            {label} <span className="badge-count num">{counts[i]}</span>
          </Link>
        ))}
      </nav>

      <div className="sub-filters">
        <nav className="tabs" aria-label="Urutan pustaka">
          {["Semua", "Rilis terbaru"].map((label, i) => (
            <Link
              key={label}
              className={`chip${i === activeFilter ? " selected" : ""}`}
              aria-current={i === activeFilter ? "page" : undefined}
              href={`/library?tab=${activeTab}&filter=${i}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {activeTab === 1 ? (
        data.history.length > 0 ? (
          <section className="stack">
            <h2 className="sr-only">Riwayat baca</h2>
            {data.history.map((item) => (
              <Link
                key={item.chapterId}
                className="row"
                href={`/chapter/${item.chapterPublicId}`}
              >
                <strong>{item.seriesTitle}</strong>
                <span>
                  Lanjut Chapter {item.chapterNumber} ·{" "}
                  <small className="meta">{item.readAt}</small>
                </span>
                <Icon name="chevRight" />
              </Link>
            ))}
            <ClearHistoryButton />
          </section>
        ) : (
          <section className="empty surface">
            <h2>Belum ada riwayat baca</h2>
            <p className="meta">Chapter yang kamu buka akan tercatat di sini.</p>
            <Link className="primary" href="/series">
              Cari manga
            </Link>
          </section>
        )
      ) : seriesList.length > 0 ? (
        <section>
          <h2 className="sr-only">{TABS[activeTab]} komik</h2>
          <div className="grid">
            {seriesList.map((comic) => (
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
                <p className="meta">
                  {comic.type} · {comic.genre}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="empty surface">
          <h2>
            {activeTab === 2 ? "Antrean masih kosong" : "Belum ada bookmark"}
          </h2>
          <p className="meta">
            {activeTab === 2
              ? "Tambahkan judul ke antrean dari halaman detail komik."
              : "Simpan manga yang kamu suka supaya mudah dicari kembali."}
          </p>
          <Link className="primary" href="/series">
            Cari manga
          </Link>
        </section>
      )}

      <BrowserImportPanel />
    </main>
  );
}
