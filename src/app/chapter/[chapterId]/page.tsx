import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icons";
import { getChapterForReader } from "@/dal/catalog";
import { recordUserHistory } from "@/dal/library";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ChapterReaderPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  const viewer = await getSessionUser();
  const data = await getChapterForReader(chapterId, viewer);
  if (!data) notFound();

  if (viewer && !data.isPreview) {
    await recordUserHistory(viewer.id, data.chapter.id, 100);
  }

  const heading =
    data.chapter.title &&
    data.chapter.title !== `Chapter ${data.chapter.number}`
      ? `Chapter ${data.chapter.number} — ${data.chapter.title}`
      : `Chapter ${data.chapter.number}`;

  const renderNav = () => (
    <nav className="actions chapter-nav" aria-label="Pindah chapter">
      {data.prevChapter && (
        <Link className="chip" href={`/chapter/${data.prevChapter.publicId}`}>
          <Icon name="chevLeft" /> Sebelumnya (Ch. {data.prevChapter.number})
        </Link>
      )}
      <Link className="chip" href={`/series/${data.series.publicId}`}>
        Daftar Chapter
      </Link>
      {data.nextChapter && (
        <Link
          className="primary"
          href={`/chapter/${data.nextChapter.publicId}`}
        >
          Berikutnya (Ch. {data.nextChapter.number}) <Icon name="chevRight" />
        </Link>
      )}
    </nav>
  );

  return (
    <main id="main" className="page" tabIndex={-1}>
      <article className="reader">
        <p className="meta">
          <Link className="chip" href={`/series/${data.series.publicId}`}>
            {data.series.title}
          </Link>
        </p>

        {data.isPreview && (
          <div className="alert warn" role="status">
            Pratinjau admin: chapter ini belum diterbitkan untuk publik.
          </div>
        )}

        <h1 className="page-title">{heading}</h1>
        {renderNav()}

        {data.panels.length > 0 ? (
          <div id="chapter-panels" className="panels">
            {data.panels.map((panel, idx) => (
              <figure key={panel.id}>
                <img
                  src={panel.url}
                  alt={`Halaman ${idx + 1}`}
                  width={panel.width}
                  height={panel.height}
                  loading={idx < 2 ? "eager" : "lazy"}
                />
              </figure>
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
    </main>
  );
}
