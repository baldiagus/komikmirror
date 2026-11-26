import React from "react";
import { notFound } from "next/navigation";
import { ChapterReaderClient } from "@/components/ChapterReaderClient";
import { getActiveAdsForSlots } from "@/dal/ads";
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

  const [, readerAds] = await Promise.all([
    viewer && !data.isPreview
      ? recordUserHistory(viewer.id, data.chapter.id, 100)
      : Promise.resolve(),
    getActiveAdsForSlots(
      ["reader_top", "reader_bottom", "reader_interstitial"],
      viewer,
    ),
  ]);

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
        topAd={readerAds.reader_top}
        bottomAd={readerAds.reader_bottom}
        interstitialAd={readerAds.reader_interstitial}
      />
    </main>
  );
}
