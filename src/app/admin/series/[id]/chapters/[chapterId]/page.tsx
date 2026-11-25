import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminChapterDetailClient } from "@/components/AdminChapterDetailClient";
import { Icon } from "@/components/Icons";
import { getAdminChapterById } from "@/dal/admin";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Kelola Chapter & Panel" };

export default async function AdminChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const admin = await requireAdmin();
  const { id, chapterId } = await params;
  const chapter = await getAdminChapterById(admin, chapterId);
  if (!chapter || chapter.seriesId !== id) notFound();

  return (
    <main id="main" className="page" tabIndex={-1}>
      <div className="return">
        <Link className="chip" href={`/admin/series/${chapter.seriesId}`}>
          <Icon name="chevLeft" /> Kembali ke {chapter.series.title}
        </Link>
      </div>
      <h1 className="page-title">
        Chapter {chapter.chapterNumber}
        {chapter.title ? ` — ${chapter.title}` : ""}
      </h1>
      <AdminChapterDetailClient chapter={chapter} />
    </main>
  );
}
