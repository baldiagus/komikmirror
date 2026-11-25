import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/AuthForms";
import { isPublicSignupAllowed } from "@/lib/env";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Daftar" };

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  if (!isPublicSignupAllowed()) {
    return (
      <main id="main" className="page" tabIndex={-1}>
        <section className="surface auth-card">
          <h1 className="page-title">Pendaftaran Ditutup</h1>
          <p className="meta">
            Pendaftaran akun publik sementara ditutup sampai layanan email dan
            pembatasan login selesai diuji. Hubungi operator untuk aktivasi akun.
          </p>
          <Link className="primary" href="/login">
            Kembali ke halaman masuk
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main id="main" className="page" tabIndex={-1}>
      <RegisterForm />
    </main>
  );
}
