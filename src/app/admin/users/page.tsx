import React from "react";
import Link from "next/link";
import { AdminUsersClient } from "@/components/AdminUsersClient";
import { Icon } from "@/components/Icons";
import { listAdminUsers } from "@/dal/admin";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Pengguna" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const q = params.q ?? "";
  const filter = params.filter ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const data = await listAdminUsers(admin, { q, filter, page });

  const FILTERS = [
    { key: "", label: "Semua", count: data.counts.all },
    { key: "admin", label: "Admin", count: data.counts.admins },
    { key: "user", label: "User", count: Math.max(0, data.counts.all - data.counts.admins) },
    { key: "banned", label: "Diblokir", count: data.counts.banned },
  ];

  const buildUrl = (nextFilter: string, nextPage = 1) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (nextFilter) qs.set("filter", nextFilter);
    if (nextPage > 1) qs.set("page", String(nextPage));
    const str = qs.toString();
    return str ? `/admin/users?${str}` : "/admin/users";
  };

  return (
    <main id="main" className="page" tabIndex={-1}>
      <div className="section-heading">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            Kelola Pengguna
          </h1>
          <p className="meta num">
            {data.counts.all.toLocaleString("id-ID")} pengguna ·{" "}
            {data.counts.admins.toLocaleString("id-ID")} admin ·{" "}
            {data.counts.banned.toLocaleString("id-ID")} diblokir
          </p>
        </div>
      </div>

      <form className="series-toolbar" action="/admin/users">
        <label className="sr-only" htmlFor="admin-user-q">
          Cari nama atau email pengguna
        </label>
        <input
          id="admin-user-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari nama atau email pengguna..."
        />
        {filter && <input type="hidden" name="filter" value={filter} />}
        <button type="submit" className="chip">
          Cari
        </button>
      </form>

      <nav className="tabs" aria-label="Filter peran pengguna">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            className={`chip${filter === f.key ? " selected" : ""}`}
            href={buildUrl(f.key, 1)}
          >
            {f.label} <span className="badge-count num">{f.count}</span>
          </Link>
        ))}
      </nav>

      {data.items.length > 0 ? (
        <AdminUsersClient users={data.items} currentAdminId={admin.id} />
      ) : (
        <section className="empty surface">
          <h2>Tidak ada pengguna ditemukan</h2>
          <p className="meta">Coba kata kunci atau filter peran lainnya.</p>
          <Link className="primary" href="/admin/users">
            Tampilkan semua pengguna
          </Link>
        </section>
      )}

      {data.totalPages > 1 && (
        <nav className="actions" aria-label="Halaman daftar pengguna">
          {data.page > 1 && (
            <Link className="chip" href={buildUrl(filter, data.page - 1)}>
              <Icon name="chevLeft" /> Sebelumnya
            </Link>
          )}
          <span className="meta num">
            Halaman {data.page} dari {data.totalPages}
          </span>
          {data.page < data.totalPages && (
            <Link className="primary" href={buildUrl(filter, data.page + 1)}>
              Berikutnya <Icon name="chevRight" />
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
