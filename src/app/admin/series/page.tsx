import React from "react";
import Link from "next/link";
import { AdminSyncControl } from "@/components/AdminSyncControl";
import { Icon } from "@/components/Icons";
import { listAdminSeries } from "@/dal/admin";
import { getShinigamiSyncConfig } from "@/lib/env";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Seri" };

const STATUSES = [
  { key: "", label: "Semua" },
  { key: "draft", label: "Draft" },
  { key: "published", label: "Terbit" },
  { key: "archived", label: "Arsip" },
];

export default async function AdminSeriesListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const data = await listAdminSeries(admin, { q, status, page });
  const syncCfg = getShinigamiSyncConfig();

  return (
    <main id="main" className="page" tabIndex={-1}>
      <div className="section-heading">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            Kelola Seri
          </h1>
          <p className="meta num">
            {data.total.toLocaleString("id-ID")} total seri
          </p>
        </div>
        <Link className="primary" href="/admin/series/new">
          <Icon name="plus" /> Buat Seri Baru
        </Link>
      </div>

      <AdminSyncControl intervalMinutes={syncCfg.intervalMinutes} />

      <form className="series-toolbar" action="/admin/series">
        <label className="sr-only" htmlFor="admin-q">
          Cari seri
        </label>
        <input
          id="admin-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari judul seri..."
        />
        <input type="hidden" name="status" value={status} />
        <button type="submit" className="chip">
          Cari
        </button>
      </form>

      <nav className="tabs" aria-label="Filter status seri">
        {STATUSES.map((st) => {
          const qs = new URLSearchParams();
          if (q) qs.set("q", q);
          if (st.key) qs.set("status", st.key);
          const href = qs.toString() ? `/admin/series?${qs}` : "/admin/series";
          return (
            <Link
              key={st.label}
              className={`chip${status === st.key ? " selected" : ""}`}
              href={href}
            >
              {st.label}
            </Link>
          );
        })}
      </nav>

      {data.items.length > 0 ? (
        <div className="stack">
          {data.items.map((item) => (
            <Link
              key={item.id}
              className="row"
              href={`/admin/series/${item.id}`}
            >
              <div>
                <strong>{item.title}</strong>
                <div className="meta">
                  {item.type} · {item.genre} · {item.slug}
                </div>
              </div>
              <div className="actions" style={{ marginBlock: 0 }}>
                <span className={`status-pill ${item.status}`}>
                  {item.status}
                </span>
                <span className="meta num">{item.updatedAt}</span>
                <Icon name="chevRight" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="empty surface">
          <h2>Belum ada seri</h2>
          <p className="meta">Buat seri baru atau ubah filter pencarian.</p>
          <Link className="primary" href="/admin/series/new">
            Buat Seri Baru
          </Link>
        </section>
      )}

      {data.totalPages > 1 && (
        <nav className="actions" aria-label="Halaman admin seri">
          {data.page > 1 && (
            <Link
              className="chip"
              href={`/admin/series?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&page=${data.page - 1}`}
            >
              <Icon name="chevLeft" /> Sebelumnya
            </Link>
          )}
          <span className="meta num">
            Halaman {data.page} dari {data.totalPages}
          </span>
          {data.page < data.totalPages && (
            <Link
              className="primary"
              href={`/admin/series?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&page=${data.page + 1}`}
            >
              Berikutnya <Icon name="chevRight" />
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
