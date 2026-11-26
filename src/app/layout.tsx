import React from "react";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { isPublicSignupAllowed } from "@/lib/env";
import { getSessionUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Komik Mirror",
    template: "%s · Komik Mirror",
  },
  description: "Katalog dan pembaca komik lokal Komik Mirror.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  const signupAllowed = isPublicSignupAllowed();

  return (
    <html lang="id">
      <body>
        <div id="top" />
        <a className="skip" href="#main">
          Lewati ke konten
        </a>
        <SiteHeader
          user={
            user
              ? {
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  image: user.image ?? null,
                }
              : null
          }
          signupAllowed={signupAllowed}
        />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
