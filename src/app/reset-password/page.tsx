import React from "react";
import { ResetPasswordForm } from "@/components/AuthForms";

export const metadata = { title: "Atur Kata Sandi Baru" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main id="main" className="page" tabIndex={-1}>
      {params.error ? (
        <section className="surface auth-card">
          <h1 className="page-title">Tautan Reset Tidak Valid</h1>
          <div className="alert error">
            Tautan reset sudah kedaluwarsa atau pernah digunakan.
          </div>
        </section>
      ) : (
        <ResetPasswordForm token={params.token ?? ""} />
      )}
    </main>
  );
}
