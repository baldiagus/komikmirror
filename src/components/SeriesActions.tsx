"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { toggleBookmarkAction, toggleQueueAction } from "@/actions/library";

export function SeriesActions({
  seriesId,
  firstChapterPublicId,
  continueChapter,
  signedIn,
  initialBookmarked,
  initialQueued,
}: {
  seriesId: string;
  firstChapterPublicId: string | null;
  continueChapter?: { publicId: string; number: string } | null;
  signedIn: boolean;
  initialBookmarked: boolean;
  initialQueued: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [queued, setQueued] = useState(initialQueued);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBookmark() {
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleBookmarkAction(seriesId);
      if (res.ok) {
        setBookmarked(res.data.bookmarked);
        setFeedback(res.message ?? null);
      } else {
        setFeedback(res.error);
      }
    });
  }

  function handleQueue() {
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleQueueAction(seriesId);
      if (res.ok) {
        setQueued(res.data.queued);
        setFeedback(res.message ?? null);
      } else {
        setFeedback(res.error);
      }
    });
  }

  return (
    <div>
      <div className="actions">
        {continueChapter ? (
          <>
            <Link
              className="primary"
              href={`/chapter/${continueChapter.publicId}`}
            >
              Lanjut Ch. {continueChapter.number}
            </Link>
            {firstChapterPublicId &&
              firstChapterPublicId !== continueChapter.publicId && (
                <Link
                  className="chip"
                  href={`/chapter/${firstChapterPublicId}`}
                >
                  Mulai Ch. 1
                </Link>
              )}
          </>
        ) : firstChapterPublicId ? (
          <Link className="primary" href={`/chapter/${firstChapterPublicId}`}>
            Mulai baca
          </Link>
        ) : (
          <span className="chip" aria-disabled="true">
            Belum ada chapter terbit
          </span>
        )}
        {signedIn ? (
          <>
            <button
              type="button"
              aria-pressed={bookmarked}
              onClick={handleBookmark}
              disabled={isPending}
            >
              {bookmarked ? "Tersimpan" : "Bookmark"}
            </button>
            <button
              type="button"
              aria-pressed={queued}
              onClick={handleQueue}
              disabled={isPending}
            >
              {queued ? "Dalam antrean" : "Tambah ke antrean"}
            </button>
          </>
        ) : (
          <Link className="chip" href={`/login?next=/series/${seriesId}`}>
            Masuk untuk Bookmark &amp; Antrean
          </Link>
        )}
      </div>
      {feedback && (
        <p className="meta" role="status">
          {feedback}
        </p>
      )}
    </div>
  );
}
