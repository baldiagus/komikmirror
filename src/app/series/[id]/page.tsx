import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icons";
import { SeriesActions } from "@/components/SeriesActions";
import { getSeriesDetail } from "@/dal/catalog";
import { getUserSeriesFlags } from "@/dal/library";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getSessionUser();
  const comic = await getSeriesDetail(id, viewer);
  if (!comic) notFound();

  const flags = viewer
    ? await getUserSeriesFlags(viewer.id, comic.id)
    : { bookmarked: false, queued: false };

  const publishedChapters = comic.chapters.filter(
    (c) => c.status === "published",
  );
  const firstReadable =
    publishedChapters.length > 0
      ? publishedChapters[publishedChapters.length - 1]
      : null;

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
          className="cover"
          src={comic.coverSrc}
          alt={comic.title}
          width={300}
          height={450}
        />
        <div>
          <p className="meta">
            {comic.type} · {comic.genre} · {comic.publicationStatus}
            {comic.rating > 0 ? ` · ${comic.rating.toFixed(1)}` : ""}
          </p>
          <h1 className="page-title">{comic.title}</h1>
          <p>{comic.summary || "Belum ada sinopsis."}</p>

          <SeriesActions
            seriesId={comic.id}
            firstChapterPublicId={firstReadable?.publicId ?? null}
            signedIn={Boolean(viewer)}
            initialBookmarked={flags.bookmarked}
            initialQueued={flags.queued}
          />
        </div>
      </section>

      <section>
        <div className="section-heading">
          <h2>Daftar Chapter</h2>
          <span className="meta num">{comic.chapters.length} chapter</span>
        </div>

        {comic.chapters.length > 0 ? (
          <div className="stack">
            {comic.chapters.map((ch) => {
              const sub =
                ch.title && ch.title !== `Chapter ${ch.number}`
                  ? ch.title
                  : "Baca chapter";
              return (
                <Link
                  key={ch.id}
                  className="row"
                  href={`/chapter/${ch.publicId}`}
                >
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
                  <span>{sub}</span>
                  <Icon name="chevRight" />
                </Link>
              );
            })}
          </div>
        ) : (
          <section className="empty surface">
            <h3>Belum ada chapter terbit</h3>
            <p className="meta">
              Chapter untuk seri ini belum tersedia di katalog publik.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
