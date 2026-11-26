"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfileNameAction } from "@/actions/account";
import type { UserAccountOverviewDTO } from "@/dal/account";
import { authClient } from "@/lib/auth-client";

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

export function SettingsClient({
  account,
  googleEnabled,
  linkedNotice,
}: {
  account: UserAccountOverviewDTO;
  googleEnabled: boolean;
  linkedNotice: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(account.name);
  const [profileStatus, setProfileStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [profilePending, startProfileTransition] = useTransition();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwStatus, setPwStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileStatus(null);
    const fd = new FormData();
    fd.set("name", name);
    startProfileTransition(async () => {
      const res = await updateProfileNameAction(fd);
      if (!res.ok) {
        setProfileStatus({ kind: "error", text: res.error });
        return;
      }
      setProfileStatus({
        kind: "ok",
        text: res.message ?? "Nama tampilan diperbarui.",
      });
      router.refresh();
    });
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwStatus(null);
    if (newPassword !== confirmPassword) {
      setPwStatus({
        kind: "error",
        text: "Konfirmasi kata sandi baru tidak cocok.",
      });
      return;
    }
    setPwBusy(true);
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (res.error) {
        setPwStatus({
          kind: "error",
          text:
            res.error.code === "INVALID_PASSWORD"
              ? "Kata sandi saat ini tidak sesuai."
              : (res.error.message ?? "Gagal mengubah kata sandi."),
        });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwStatus({
        kind: "ok",
        text: "Kata sandi berhasil diperbarui dan sesi di perangkat lain telah dihentikan.",
      });
    } finally {
      setPwBusy(false);
    }
  }

  async function handleLinkGoogle() {
    setLinkError(null);
    setLinkBusy(true);
    try {
      const res = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/settings?linked=google",
      });
      if (res?.error) {
        setLinkError(
          res.error.message ?? "Gagal menghubungkan akun Google.",
        );
        setLinkBusy(false);
      }
    } catch {
      setLinkError("Gagal menghubungkan akun Google.");
      setLinkBusy(false);
    }
  }

  return (
    <div className="settings-grid">
      <div className="stack" style={{ gap: 16 }}>
        <section className="surface side">
          <div className="settings-profile-head">
            <div className="avatar-pill settings-avatar" aria-hidden="true">
              {account.image ? (
                <img
                  className="avatar-img"
                  src={account.image}
                  alt=""
                  width={52}
                  height={52}
                  referrerPolicy="no-referrer"
                />
              ) : (
                initials(account.name)
              )}
            </div>
            <div className="admin-user-text">
              <div className="admin-user-badges">
                <strong style={{ fontSize: 16 }}>{account.name}</strong>
                <span
                  className={`status-pill ${account.role === "admin" ? "published" : ""}`}
                >
                  {account.role}
                </span>
              </div>
              <span className="meta">
                {account.email} ·{" "}
                {account.emailVerified ? "Terverifikasi" : "Belum verifikasi"} ·
                Bergabung <span className="num">{account.createdAt}</span>
              </span>
            </div>
          </div>

          <h2 style={{ fontSize: 16, marginTop: 16, marginBottom: 10 }}>
            Profil Akun
          </h2>
          {profileStatus && (
            <div
              className={`alert ${profileStatus.kind}`}
              role={profileStatus.kind === "error" ? "alert" : "status"}
            >
              {profileStatus.text}
            </div>
          )}
          <form className="stack" onSubmit={handleProfileSubmit}>
            <label>
              Nama tampilan
              <input
                type="text"
                name="name"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div>
              <button
                type="submit"
                className="primary"
                disabled={profilePending}
              >
                {profilePending ? "Menyimpan..." : "Simpan profil"}
              </button>
            </div>
          </form>
        </section>

        <section className="surface side">
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>Keamanan Kata Sandi</h2>
          {account.hasPassword ? (
            <>
              {pwStatus && (
                <div
                  className={`alert ${pwStatus.kind}`}
                  role={pwStatus.kind === "error" ? "alert" : "status"}
                >
                  {pwStatus.text}
                </div>
              )}
              <form className="stack" onSubmit={handlePasswordSubmit}>
                <label>
                  Kata sandi saat ini
                  <input
                    type="password"
                    name="currentPassword"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </label>
                <label>
                  Kata sandi baru (min. 8 karakter)
                  <input
                    type="password"
                    name="newPassword"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </label>
                <label>
                  Ulangi kata sandi baru
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </label>
                <div>
                  <button type="submit" className="primary" disabled={pwBusy}>
                    {pwBusy ? "Memperbarui..." : "Ubah kata sandi"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <p className="meta" style={{ margin: 0 }}>
              Akun ini masuk menggunakan Google tanpa kata sandi lokal.
              Pengamanan kata sandi dikelola langsung dari akun Google Anda.
            </p>
          )}
        </section>
      </div>

      <div className="stack" style={{ gap: 16 }}>
        <section className="surface side">
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>
            Metode Login Tertaut
          </h2>
          {linkedNotice && (
            <div className="alert ok" role="status">
              Akun Google berhasil dihubungkan ke akun Anda.
            </div>
          )}
          {linkError && (
            <div className="alert error" role="alert">
              {linkError}
            </div>
          )}
          <div className="stack">
            <div className="row provider-row">
              <div>
                <strong>Google</strong>
                <div className="meta">
                  {account.hasGoogle ? "Terhubung" : "Belum terhubung"}
                </div>
              </div>
              {account.hasGoogle ? (
                <span className="status-pill published">Aktif</span>
              ) : googleEnabled ? (
                <button
                  type="button"
                  className="chip"
                  disabled={linkBusy}
                  onClick={handleLinkGoogle}
                >
                  {linkBusy ? "Menghubungkan..." : "Hubungkan"}
                </button>
              ) : (
                <span className="meta">Nonaktif</span>
              )}
            </div>
            <div className="row provider-row">
              <div>
                <strong>Email &amp; Kata Sandi</strong>
                <div className="meta">
                  {account.hasPassword ? "Terhubung" : "Tidak digunakan"}
                </div>
              </div>
              <span
                className={`status-pill ${account.hasPassword ? "published" : ""}`}
              >
                {account.hasPassword ? "Aktif" : "—"}
              </span>
            </div>
          </div>
        </section>

        <section className="surface side">
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>
            Ekspor Data Pustaka
          </h2>
          <p className="meta">
            Unduh salinan JSON berisi{" "}
            <strong className="num">{account.libraryCounts.bookmarks}</strong>{" "}
            bookmark,{" "}
            <strong className="num">{account.libraryCounts.queue}</strong>{" "}
            antrean, dan{" "}
            <strong className="num">{account.libraryCounts.history}</strong>{" "}
            riwayat baca akun Anda (kompatibel dengan fitur impor di{" "}
            <Link href="/library">Pustaka</Link>).
          </p>
          <a
            className="primary"
            href="/api/library/export"
            download="komik-mirror-library.json"
          >
            Unduh Cadangan JSON
          </a>
        </section>
      </div>
    </div>
  );
}
