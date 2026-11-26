"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_TABS = [
  { label: "Kelola Seri", href: "/admin/series" },
  { label: "Kelola Pengguna", href: "/admin/users" },
];

export function AdminSubNav() {
  const pathname = usePathname();
  return (
    <div className="admin-subnav-wrap">
      <nav className="admin-subnav" aria-label="Navigasi panel admin">
        {ADMIN_TABS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              className={`chip${active ? " selected" : ""}`}
              aria-current={active ? "page" : undefined}
              href={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
