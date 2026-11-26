import React from "react";
import Link from "next/link";
import { AdminAdsClient } from "@/components/AdminAdsClient";
import { listAdminAds } from "@/dal/ads";
import { requireAdmin } from "@/lib/session";
import { AD_SLOT_META, AD_SLOTS } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Kelola Iklan" };

const STATUS_FILTERS = [
  { key: "", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "draft", label: "Draft" },
  { key: "paused", label: "Dijeda" },
];

export default async function AdminAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; status?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const slot = params.slot ?? "";
  const status = params.status ?? "";

  const data = await listAdminAds(admin, { slot, status });

  const buildUrl = (nextSlot: string, nextStatus: string) => {
    const qs = new URLSearchParams();
    if (nextSlot) qs.set("slot", nextSlot);
    if (nextStatus) qs.set("status", nextStatus);
    const str = qs.toString();
    return str ? `/admin/ads?${str}` : "/admin/ads";
  };

  return (
    <main id="main" className="page" tabIndex={-1}>
      <div className="section-heading" style={{ marginTop: 0 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            Kelola Iklan
          </h1>
          <p className="meta" style={{ margin: 0 }}>
            Sistem iklan hybrid: unggah banner mandiri (desktop &amp; mobile)
            atau tempel kode Ad Network dalam iframe sandbox yang aman.
          </p>
        </div>
      </div>

      <section className="ad-kpi-grid" aria-label="Ringkasan performa iklan">
        <div className="surface ad-kpi">
          <span className="meta">Kampanye Aktif</span>
          <strong className="num">
            {data.summary.active} / {data.summary.total}
          </strong>
        </div>
        <div className="surface ad-kpi">
          <span className="meta">Total Tayangan</span>
          <strong className="num">
            {data.summary.impressions.toLocaleString("id-ID")}
          </strong>
        </div>
        <div className="surface ad-kpi">
          <span className="meta">Total Klik</span>
          <strong className="num">
            {data.summary.clicks.toLocaleString("id-ID")}
          </strong>
        </div>
        <div className="surface ad-kpi">
          <span className="meta">CTR Rata-rata</span>
          <strong className="num points">{data.summary.ctr.toFixed(2)}%</strong>
        </div>
      </section>

      <nav className="tabs" aria-label="Filter status iklan">
        {STATUS_FILTERS.map((st) => (
          <Link
            key={st.label}
            className={`chip${status === st.key ? " selected" : ""}`}
            href={buildUrl(slot, st.key)}
          >
            {st.label}
          </Link>
        ))}
      </nav>

      <nav className="tabs" aria-label="Filter posisi slot iklan">
        <Link
          className={`chip${slot === "" ? " selected" : ""}`}
          href={buildUrl("", status)}
        >
          Semua Slot
        </Link>
        {AD_SLOTS.map((key) => (
          <Link
            key={key}
            className={`chip${slot === key ? " selected" : ""}`}
            href={buildUrl(key, status)}
          >
            {AD_SLOT_META[key].label}
          </Link>
        ))}
      </nav>

      <AdminAdsClient ads={data.items} totalCount={data.summary.total} />
    </main>
  );
}
