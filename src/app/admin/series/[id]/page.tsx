import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSeriesDetailClient } from "@/components/AdminSeriesDetailClient";
import { Icon } from "@/components/Icons";
import { getAdminSeriesById } from "@/dal/admin";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Detail Seri" };

export default async function AdminSeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const series = await getAdminSeriesById(admin, id);
  if (!series) notFound();

  return (
    <main id="main" className="page" tabIndex={-1}>
      <div className="return">
        <Link className="chip" href="/admin/series">
          <Icon name="chevLeft" /> Daftar Seri Admin
        </Link>
      </div>
      <h1 className="page-title">{series.title}</h1>
      <AdminSeriesDetailClient series={series} />
    </main>
  );
}
