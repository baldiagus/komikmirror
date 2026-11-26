import React from "react";
import Link from "next/link";
import { BrowserImportPanel } from "@/components/BrowserImportPanel";
import { ClearHistoryButton } from "@/components/ClearHistoryButton";
import { Icon } from "@/components/Icons";
import {
  LibraryAnimatedContainer,
  RemoveLibraryItemButton,
} from "@/components/LibraryInteractive";
import { getUserLibrary } from "@/dal/library";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pustaka" };

const TABS = [
  { key: 0, slug: "bookmarks", label: "Bookmark", icon: "bookmark" as const },
  { key: 1, slug: "history", label: "Riwayat", icon: "clock" as const },
  { key: 2, slug: "queue", label: "Antrean", icon: "list" as const },
];

function resolveActiveTab(raw: string | undefined): 0 | 1 | 2 {
  if (!raw) return 0;
  const lower = raw.trim().toLowerCase();
  if (lower === "1" || lower === "history" || lower === "riwayat") return 1;
  if (lower === "2" || lower === "queue" || lower === "antrean") return 2;
  return 0;
}

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
  const activeTab = resolveActiveTab(params.tab);
  const activeFilter = Number(params.filter ?? "0") === 1 ? 1 : 0;

  const data = await getUserLibrary(viewer.id, activeFilter);
  const counts = [
    String(data.counts.bookmarks),
    String(data.counts.history),
    `${data.counts.queue}/${data.counts.maxQueue}`,
  ];

  const seriesList = activeTab === 2 ? data.queue : data.bookmarks;
  const sortLabels =
    activeTab === 1
      ? ["Terakhir dibaca", "Rilis terbaru"]
      : activeTab === 2
        ? ["Urutan antrean", "Rilis terbaru"]
        : ["Baru disimpan", "Rilis terbaru"];

  const tabHref = (tabIdx: number, filterIdx = 0) => {
    const qs = new URLSearchParams();
    if (tabIdx > 0) qs.set("tab", String(tabIdx));
    if (filterIdx > 0) qs.set("filter", String(filterIdx));
    const str = qs.toString();
    return str ? `/library?${str}` : "/library";
  };

  return (
    <main id="main" className="page" tabIndex={-1}>
      <div className="section-heading" style={{ marginTop: 0 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            Pustaka
          </h1>
          <p className="meta" style={{ margin: 0 }}>
            Koleksi bookmark, riwayat baca, dan antrean pribadi akun{" "}
            <strong>{viewer.name}</strong>.
          </p>
        </div>
      </div>

      <nav className="seg-tabs" aria-label="Pustaka">
        {TABS.map((tab, i) => {
          const isSelected = i === activeTab;
          return (
            <Link
              key={tab.label}
              className={`seg-tab${isSelected ? " selected" : ""}`}
              aria-current={isSelected ? "page" : undefined}
              href={tabHref(i, 0)}
            >
              <span className="seg-tab-icon">
                <Icon name={tab.icon} size={15} />
              </span>
              <span className="seg-tab-label">{tab.label}</span>
              <span className="badge-count num">{counts[i]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="library-toolbar">
        <nav className="tabs" aria-label="Urutan pustaka">
          {sortLabels.map((label, i) => (
            <Link
              key={label}
              className={`chip${i === activeFilter ? " selected" : ""}`}
              aria-current={i === activeFilter ? "page" : undefined}
              href={tabHref(activeTab, i)}
            >
              {label}
            </Link>
          ))}
        </nav>

        {activeTab === 1 && data.history.length > 0 && <ClearHistoryButton />}
      </div>

      {activeTab === 1 ? (
        data.history.length > 0 ? (
          <section aria-label="Riwayat baca">
            <h2 className="sr-only">Riwayat baca</h2>
            <LibraryAnimatedContainer
              tabKey={`history-${activeFilter}`}
              className="history-grid"
            >
              {data.history.map((item) => {
                const behindLatest =
                  item.latestChapterNumber &&
                  item.latestChapterNumber !== item.chapterNumber;
                return (
                  <article
                    key={item.chapterId}
                    data-lib-card
                    className="surface history-card"
                  >
                    <Link
                      className="history-thumb"
                      href={`/chapter/${item.chapterPublicId}`}
                      aria-label={`Lanjut baca ${item.seriesTitle}`}
                    >
                      <img
                        className="cover"
                        src={item.coverSrc}
                        alt=""
                        width={160}
                        height={240}
                        loading="lazy"
                      />
                    </Link>
                    <div className="history-body">
                      <Link
                        className="history-title"
                        href={`/series/${item.seriesPublicId}`}
                      >
                        {item.seriesTitle}
                      </Link>
                      <div className="history-meta">
                        <span className="num">
                          Terakhir: <strong>Ch. {item.chapterNumber}</strong>
                          {behindLatest && (
                            <span className="meta">
                              {" "}
                              / Ch. {item.latestChapterNumber}
                            </span>
                          )}
                        </span>
                        <span className="meta num">{item.readAt}</span>
                      </div>
                      <div className="history-actions">
                        <Link
                          className="primary lib-cta"
                          href={`/chapter/${item.chapterPublicId}`}
                        >
                          Lanjut Ch. {item.chapterNumber}
                        </Link>
                        <Link
                          className="chip lib-cta"
                          href={`/series/${item.seriesPublicId}`}
                        >
                          Detail
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </LibraryAnimatedContainer>
          </section>
        ) : (
          <section className="empty surface lib-empty">
            <div className="lib-empty-ico">
              <Icon name="clock" size={24} />
            </div>
            <h2>Belum ada riwayat baca</h2>
            <p className="meta">
              Chapter yang kamu buka akan otomatis tercatat di sini supaya mudah
              dilanjutkan.
            </p>
            <Link className="primary" href="/series">
              Jelajahi komik
            </Link>
          </section>
        )
      ) : seriesList.length > 0 ? (
        <section aria-label={`${TABS[activeTab].label} komik`}>
          <h2 className="sr-only">{TABS[activeTab].label} komik</h2>
          <LibraryAnimatedContainer
            tabKey={`${activeTab}-${activeFilter}`}
            className="grid"
          >
            {seriesList.map((comic, idx) => (
              <article
                key={comic.id}
                data-lib-card
                className="surface tile lib-tile"
              >
                <Link
                  className="lib-cover-wrap"
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
                  {activeTab === 2 && (
                    <span className="queue-pos num">#{idx + 1}</span>
                  )}
                  {comic.rating > 0 && (
                    <span className="rating">
                      <Icon name="star" size={11} /> {comic.rating.toFixed(1)}
                    </span>
                  )}
                </Link>
                <Link href={`/series/${comic.publicId}`}>
                  <h3>{comic.title}</h3>
                </Link>
                <p className="meta lib-tile-sub">
                  {comic.type}
                  {comic.latestChapterNumber
                    ? ` · Ch. ${comic.latestChapterNumber}`
                    : ` · ${comic.genre}`}
                </p>
                <div className="lib-tile-foot">
                  <span className="meta num">{comic.updatedAt}</span>
                  <RemoveLibraryItemButton
                    kind={activeTab === 2 ? "queue" : "bookmark"}
                    seriesId={comic.id}
                    title={comic.title}
                  />
                </div>
              </article>
            ))}
          </LibraryAnimatedContainer>
        </section>
      ) : (
        <section className="empty surface lib-empty">
          <div className="lib-empty-ico">
            <Icon name={activeTab === 2 ? "list" : "bookmark"} size={24} />
          </div>
          <h2>
            {activeTab === 2 ? "Antrean masih kosong" : "Belum ada bookmark"}
          </h2>
          <p className="meta">
            {activeTab === 2
              ? "Tambahkan judul ke antrean baca dari halaman detail komik (maks. 30 judul)."
              : "Simpan komik favoritmu supaya mudah dipantau update chapternya."}
          </p>
          <Link className="primary" href="/series">
            Jelajahi komik
          </Link>
        </section>
      )}

      <BrowserImportPanel />
    </main>
  );
}
