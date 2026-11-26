import React from "react";
import { notFound } from "next/navigation";
import { ChapterReaderClient } from "@/components/ChapterReaderClient";
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

  return (
    <main id="main" className="page reader-page" tabIndex={-1}>
      <ChapterReaderClient
        seriesPublicId={data.series.publicId}
        seriesTitle={data.series.title}
        heading={heading}
        currentChapterPublicId={data.chapter.publicId}
        isPreview={data.isPreview}
        panels={data.panels}
        prevChapter={data.prevChapter}
        nextChapter={data.nextChapter}
        allChapters={data.allChapters}
      />
    </main>
  );
}
