import React from "react";
import Link from "next/link";

export const metadata = { title: "Verifikasi Email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; error?: string }>;
}) {
  const params = await searchParams;
  const hasError = Boolean(params.error);

  return (
    <main id="main" className="page" tabIndex={-1}>
      <section className="surface auth-card">
        <h1 className="page-title">Verifikasi Email</h1>
        {hasError ? (
          <div className="alert error" role="alert">
            Tautan verifikasi tidak valid atau sudah pernah digunakan.
          </div>
        ) : (
          <div className="alert ok" role="status">
            Email Anda berhasil diverifikasi. Anda dapat masuk dan mengakses
            Pustaka sekarang.
          </div>
        )}
        <div className="actions">
          <Link className="primary" href="/library">
            Buka Pustaka
          </Link>
          <Link className="chip" href="/login">
            Halaman Masuk
          </Link>
        </div>
      </section>
    </main>
  );
}
