import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSubNav } from "@/components/AdminSubNav";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/admin/series");
  }
  if (user.role !== "admin") {
    return (
      <main id="main" className="page" tabIndex={-1}>
        <section className="empty surface">
          <h1>Akses Ditolak (403)</h1>
          <p className="meta">
            Halaman pengelolaan katalog hanya dapat diakses oleh akun dengan
            peran admin.
          </p>
          <Link className="primary" href="/">
            Kembali ke beranda
          </Link>
        </section>
      </main>
    );
  }
  return (
    <>
      <AdminSubNav />
      {children}
    </>
  );
}
