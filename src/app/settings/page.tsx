import React from "react";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/SettingsClient";
import { getUserAccountOverview } from "@/dal/account";
import { isGoogleAuthEnabled } from "@/lib/env";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan Akun" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ linked?: string }>;
}) {
  const viewer = await getSessionUser();
  if (!viewer) {
    redirect("/login?next=/settings");
  }

  const [overview, params] = await Promise.all([
    getUserAccountOverview(viewer.id),
    searchParams,
  ]);
  if (!overview) {
    redirect("/login?next=/settings");
  }

  return (
    <main id="main" className="page" tabIndex={-1}>
      <h1 className="page-title">Pengaturan Akun</h1>
      <SettingsClient
        account={overview}
        googleEnabled={isGoogleAuthEnabled()}
        linkedNotice={params.linked === "google" ? "google" : null}
      />
    </main>
  );
}
