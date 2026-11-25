import React from "react";
import { ForgotPasswordForm } from "@/components/AuthForms";

export const metadata = { title: "Reset Kata Sandi" };

export default function ForgotPasswordPage() {
  return (
    <main id="main" className="page" tabIndex={-1}>
      <ForgotPasswordForm />
    </main>
  );
}
