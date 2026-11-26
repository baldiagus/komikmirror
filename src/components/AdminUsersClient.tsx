"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setAdminUserBannedAction,
  setAdminUserRoleAction,
} from "@/actions/admin";
import type { AdminUserItemDTO } from "@/dal/admin";

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

function providerLabel(id: string): string {
  if (id === "google") return "Google";
  if (id === "credential") return "Email";
  return id;
}

export function AdminUsersClient({
  users,
  currentAdminId,
}: {
  users: AdminUserItemDTO[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  function handleRoleToggle(u: AdminUserItemDTO) {
    const nextRole = u.role === "admin" ? "user" : "admin";
    setFeedback(null);
    setBusyId(u.id);
    startTransition(async () => {
      try {
        const res = await setAdminUserRoleAction(u.id, nextRole);
        if (!res.ok) {
          setFeedback({ kind: "error", text: res.error });
        } else {
          setFeedback({
            kind: "ok",
            text: `${u.email}: ${res.message ?? "Role diperbarui."}`,
          });
          router.refresh();
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleBanToggle(u: AdminUserItemDTO) {
    const nextBanned = !u.banned;
    setFeedback(null);
    setBusyId(u.id);
    startTransition(async () => {
      try {
        const res = await setAdminUserBannedAction(u.id, nextBanned);
        if (!res.ok) {
          setFeedback({ kind: "error", text: res.error });
        } else {
          setFeedback({
            kind: "ok",
            text: `${u.email}: ${res.message ?? "Status blokir diperbarui."}`,
          });
          router.refresh();
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <>
      {feedback && (
        <div
          className={`alert ${feedback.kind}`}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </div>
      )}

      <div className="stack">
        {users.map((u) => {
          const isSelf = u.id === currentAdminId;
          const isBusy = busyId === u.id;
          return (
            <div key={u.id} className="row admin-user-row">
              <div className="admin-user-info">
                <div className="avatar-pill" aria-hidden="true">
                  {u.image ? (
                    <img
                      className="avatar-img"
                      src={u.image}
                      alt=""
                      width={36}
                      height={36}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    initials(u.name)
                  )}
                </div>
                <div className="admin-user-text">
                  <div className="admin-user-badges">
                    <strong>{u.name}</strong>
                    <span
                      className={`status-pill ${u.role === "admin" ? "published" : ""}`}
                    >
                      {u.role}
                    </span>
                    {u.banned && (
                      <span className="status-pill archived">Diblokir</span>
                    )}
                    {isSelf && <span className="read-badge">Akun Anda</span>}
                  </div>
                  <div className="meta">
                    {u.email}
                    {u.providers.length > 0 && (
                      <>
                        {" "}
                        · {u.providers.map(providerLabel).join(" + ")}
                      </>
                    )}
                    {" · "}
                    {u.emailVerified ? "Terverifikasi" : "Belum verifikasi"}
                    {" · "}
                    <span className="num">{u.createdAt}</span>
                  </div>
                </div>
              </div>

              <div className="actions" style={{ marginBlock: 0 }}>
                {isSelf ? (
                  <span className="meta">Terkunci (akun aktif)</span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="chip"
                      disabled={isBusy}
                      onClick={() => handleRoleToggle(u)}
                    >
                      {u.role === "admin" ? "Turunkan ke User" : "Jadikan Admin"}
                    </button>
                    <button
                      type="button"
                      className={u.banned ? "chip" : "danger-btn"}
                      disabled={isBusy}
                      onClick={() => handleBanToggle(u)}
                    >
                      {u.banned ? "Buka Blokir" : "Blokir"}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
