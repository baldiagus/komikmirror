import React from "react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="foot-grid">
        <div>
          <Link className="brand" href="/" aria-label="Komik Mirror, beranda">
            <img
              className="brand-logo"
              src="/komik-mirror-lockup.svg"
              alt="Komik Mirror"
              width={500}
              height={216}
              decoding="async"
            />
          </Link>
          <p>
            Baca manga, manhwa, dan manhua terbaru. Kelola bookmark, antrean,
            dan riwayat baca pada akun Anda.
          </p>
        </div>
        <nav aria-label="Jelajahi">
          <strong>Jelajahi</strong>
          <Link href="/">Beranda</Link>
          <Link href="/series">Komik</Link>
          <Link href="/library">Pustaka</Link>
        </nav>
        <nav aria-label="Akun">
          <strong>Akun</strong>
          <Link href="/login">Masuk</Link>
          <Link href="/forgot-password">Reset kata sandi</Link>
          <Link href="/admin/series">Admin Katalog</Link>
        </nav>
        <nav aria-label="Status">
          <strong>Migrasi</strong>
          <span className="meta">
            Katalog, pembaca, dan pustaka berjalan di Next.js + MySQL.
          </span>
        </nav>
      </div>
      <div className="foot-end">
        <span>Komik Mirror · Katalog &amp; Pembaca</span>
        <a href="#top">Kembali ke atas</a>
      </div>
    </footer>
  );
}
