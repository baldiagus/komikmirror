import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="page" tabIndex={-1}>
      <section className="empty surface">
        <h1>Halaman tidak ditemukan</h1>
        <p>Tautan yang kamu buka tidak tersedia atau belum diterbitkan.</p>
        <Link className="primary" href="/">
          Kembali ke beranda
        </Link>
      </section>
    </main>
  );
}
