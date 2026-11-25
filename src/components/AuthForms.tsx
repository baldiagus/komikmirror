"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginForm({
  nextPath,
  signupAllowed,
}: {
  nextPath: string;
  signupAllowed: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (res.error) {
        if (res.error.code === "EMAIL_NOT_VERIFIED") {
          setError(
            "Email Anda belum terverifikasi. Kami telah mengirim tautan verifikasi baru ke inbox Anda.",
          );
        } else if (res.error.status === 429) {
          setError(
            "Terlalu banyak percobaan login. Tunggu sebentar lalu coba lagi.",
          );
        } else {
          setError(res.error.message ?? "Email atau kata sandi salah.");
        }
        return;
      }
      const safeTarget =
        nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
      window.location.assign(safeTarget);
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!email.trim()) {
      setError("Masukkan email terlebih dahulu untuk mengirim ulang verifikasi.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: "/verify-email?verified=1",
      });
      if (res.error) {
        setError(res.error.message ?? "Gagal mengirim ulang email verifikasi.");
      } else {
        setInfo("Tautan verifikasi baru telah dikirim ke email Anda.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface auth-card">
      <h1 className="page-title">Masuk</h1>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {info && (
        <div className="alert ok" role="status">
          {info}
        </div>
      )}
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Kata sandi
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="primary full" type="submit" disabled={busy}>
          {busy ? "Memproses..." : "Masuk"}
        </button>
      </form>
      <div className="actions" style={{ justifyContent: "space-between", marginTop: 16 }}>
        <Link className="meta" href="/forgot-password">
          Lupa kata sandi?
        </Link>
        <button
          type="button"
          className="chip"
          onClick={resendVerification}
          disabled={busy}
        >
          Kirim ulang verifikasi
        </button>
      </div>
      {signupAllowed && (
        <p className="meta" style={{ marginTop: 12 }}>
          Belum punya akun? <Link href="/register">Daftar sekarang</Link>
        </p>
      )}
    </section>
  );
}

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
        callbackURL: "/verify-email?verified=1",
      });
      if (res.error) {
        setError(res.error.message ?? "Pendaftaran gagal.");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface auth-card">
      <h1 className="page-title">Daftar Akun</h1>
      {done ? (
        <div className="alert ok" role="status">
          Pendaftaran berhasil. Periksa kotak masuk email Anda dan klik tautan
          verifikasi sebelum masuk.
        </div>
      ) : (
        <>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <form className="stack" onSubmit={onSubmit}>
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
            <label>
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Kata sandi (min. 8 karakter)
              <input
                type="password"
                name="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="primary full" type="submit" disabled={busy}>
              {busy ? "Mendaftar..." : "Buat akun"}
            </button>
          </form>
        </>
      )}
      <p className="meta" style={{ marginTop: 12 }}>
        Sudah punya akun? <Link href="/login">Masuk</Link>
      </p>
    </section>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reset-password",
      });
      if (res.error) {
        setError(res.error.message ?? "Gagal memproses permintaan.");
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface auth-card">
      <h1 className="page-title">Reset Kata Sandi</h1>
      {sent ? (
        <div className="alert ok" role="status">
          Jika email terdaftar, tautan reset kata sandi sekali pakai telah
          dikirim ke kotak masuk Anda.
        </div>
      ) : (
        <>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <form className="stack" onSubmit={onSubmit}>
            <label>
              Email akun
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="primary full" type="submit" disabled={busy}>
              {busy ? "Mengirim..." : "Kirim tautan reset"}
            </button>
          </form>
        </>
      )}
      <p className="meta" style={{ marginTop: 12 }}>
        <Link href="/login">Kembali ke halaman masuk</Link>
      </p>
    </section>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Token reset tidak ditemukan atau tidak valid.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (res.error) {
        setError(
          res.error.message ??
            "Token tidak valid atau sudah pernah digunakan.",
        );
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface auth-card">
      <h1 className="page-title">Atur Kata Sandi Baru</h1>
      {done ? (
        <div className="alert ok" role="status">
          Kata sandi berhasil diperbarui. Mengalihkan ke halaman masuk...
        </div>
      ) : (
        <>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <form className="stack" onSubmit={onSubmit}>
            <label>
              Kata sandi baru (min. 8 karakter)
              <input
                type="password"
                name="password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Ulangi kata sandi baru
              <input
                type="password"
                name="confirm"
                required
                minLength={8}
                maxLength={128}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <button className="primary full" type="submit" disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan kata sandi"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
