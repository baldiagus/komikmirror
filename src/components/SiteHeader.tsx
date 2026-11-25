"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { QuickSearchDialog } from "@/components/QuickSearchDialog";

export interface HeaderUser {
  name: string;
  email: string;
  role: string;
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("") || "KM"
  ).toUpperCase();
}

export function SiteHeader({
  user,
  signupAllowed,
}: {
  user: HeaderUser | null;
  signupAllowed: boolean;
}) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const navItems = [
    { label: "Komik", href: "/series" },
    { label: "Pustaka", href: "/library" },
    ...(user?.role === "admin"
      ? [{ label: "Admin", href: "/admin/series" }]
      : []),
  ];

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      window.location.assign("/");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="site-header">
      <div className="masthead">
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

        <nav className="site-nav" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href === "/series" && pathname.startsWith("/chapter/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="tools">
          <QuickSearchDialog />
          {user ? (
            <details className="user-menu">
              <summary className="avatar-pill" aria-label="Menu pengguna">
                {initials(user.name)}
              </summary>
              <nav className="surface" aria-label="Menu pengguna">
                <div className="user-menu-head">
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </div>
                <Link href="/library">Pustaka saya</Link>
                {user.role === "admin" && (
                  <Link href="/admin/series">Panel Admin</Link>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? "Keluar..." : "Keluar"}
                </button>
              </nav>
            </details>
          ) : (
            <>
              <Link className="chip" href="/login">
                Masuk
              </Link>
              {signupAllowed && (
                <Link className="primary" href="/register">
                  Daftar
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
