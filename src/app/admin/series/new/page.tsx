import React from "react";
import Link from "next/link";
import { AdminSeriesNewForm } from "@/components/AdminSeriesNewForm";
import { Icon } from "@/components/Icons";

export const metadata = { title: "Admin · Buat Seri Baru" };

export default function AdminSeriesNewPage() {
  return (
    <main id="main" className="page" tabIndex={-1}>
      <div className="return">
        <Link className="chip" href="/admin/series">
          <Icon name="chevLeft" /> Kembali ke daftar seri
        </Link>
      </div>
      <h1 className="page-title">Buat Seri Baru</h1>
      <AdminSeriesNewForm />
    </main>
  );
}
