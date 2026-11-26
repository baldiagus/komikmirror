import React from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { isGoogleAuthEnabled, isPublicSignupAllowed } from "@/lib/env";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  const nextPath = params.next ?? "/";
  if (user) {
    redirect(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/");
  }

  return (
    <main id="main" className="page" tabIndex={-1}>
      <LoginForm
        nextPath={nextPath}
        signupAllowed={isPublicSignupAllowed()}
        googleEnabled={isGoogleAuthEnabled()}
        oauthError={params.error ?? null}
      />
    </main>
  );
}
