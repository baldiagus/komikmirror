"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function sanitizeNextPath(nextPath: string | undefined, fallback = "/"): string {
  if (!nextPath) return fallback;
  return nextPath.startsWith("/") && !nextPath.startsWith("//")
    ? nextPath
    : fallback;
}

function formatOAuthError(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "signup_disabled":
      return "Pendaftaran akun baru saat ini ditutup. Hanya akun yang sudah terdaftar yang dapat masuk dengan Google.";
    case "access_denied":
      return "Akses Google dibatalkan. Anda dapat mencoba lagi kapan saja.";
    case "account_not_linked":
      return "Email Google ini sudah terdaftar dengan metode lain yang belum terverifikasi. Verifikasi email Anda terlebih dahulu lalu coba lagi.";
    case "unable_to_create_user":
      return "Gagal membuat akun baru dari profil Google. Silakan coba lagi.";
    case "email_not_verified":
      return "Email akun Google Anda belum terverifikasi di Google.";
    case "state_mismatch":
    case "please_restart_the_process":
    case "invalid_code":
      return "Sesi otorisasi Google telah kedaluwarsa. Silakan ulangi proses autentikasi.";
    default:
      return "Gagal memproses otorisasi Google. Silakan coba lagi.";
  }
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      className="google-mark"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3a7.17 7.17 0 0 1-10.67-3.77H1.41v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.41 14.32A7.22 7.22 0 0 1 5.03 12c0-.8.14-1.58.38-2.32V6.59H1.41A12 12 0 0 0 0 12c0 1.94.46 3.77 1.41 5.41l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.41 6.59l4 3.09A7.15 7.15 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

function GoogleAuthButton({
  mode,
  callbackURL,
  newUserCallbackURL,
  errorCallbackURL,
  googleEnabled,
  disabled,
  onStart,
  onError,
  onFinally,
}: {
  mode: "login" | "register";
  callbackURL: string;
  newUserCallbackURL: string;
  errorCallbackURL: string;
  googleEnabled: boolean;
  disabled: boolean;
  onStart: () => void;
  onError: (msg: string) => void;
  onFinally: () => void;
}) {
  const [googleBusy, setGoogleBusy] = useState(false);

  async function handleGoogleAuth() {
    if (!googleEnabled) {
      onError(
        "Login Google belum dikonfigurasi. Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET terlebih dahulu.",
      );
      return;
    }
    onStart();
    setGoogleBusy(true);
    try {
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL,
        newUserCallbackURL,
        errorCallbackURL,
        ...(mode === "register" ? { requestSignUp: true } : {}),
      });
      if (res?.error) {
        if (res.error.status === 429) {
          onError(
            "Terlalu banyak percobaan autentikasi. Tunggu sebentar lalu coba lagi.",
          );
        } else {
          onError(
            res.error.message ??
              "Gagal menghubungkan ke Google. Silakan coba lagi.",
          );
        }
        setGoogleBusy(false);
        onFinally();
      }
    } catch {
      onError("Gagal menghubungkan ke Google. Silakan coba lagi.");
      setGoogleBusy(false);
      onFinally();
    }
  }

  const label = googleBusy
    ? "Menghubungkan ke Google..."
    : mode === "register"
      ? "Daftar dengan Google"
      : "Masuk dengan Google";

  return (
    <div className="oauth-block">
      <button
        type="button"
        className="btn-google full"
        onClick={handleGoogleAuth}
        disabled={disabled || googleBusy || !googleEnabled}
        data-google-auth={mode}
      >
        <GoogleMark />
        <span>{label}</span>
      </button>
      {!googleEnabled && (
        <p className="meta oauth-hint">
          OAuth Google belum aktif. Atur <code>GOOGLE_CLIENT_ID</code> dan{" "}
          <code>GOOGLE_CLIENT_SECRET</code> pada environment untuk mengaktifkan.
        </p>
      )}
    </div>
  );
}

export function LoginForm({
  nextPath,
  signupAllowed,
  googleEnabled,
  oauthError,
}: {
  nextPath: string;
  signupAllowed: boolean;
  googleEnabled: boolean;
  oauthError?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    formatOAuthError(oauthError),
  );
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const safeTarget = sanitizeNextPath(nextPath, "/");
  const registerHref =
    safeTarget !== "/"
      ? `/register?next=${encodeURIComponent(safeTarget)}`
      : "/register";

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
      <GoogleAuthButton
        mode="login"
        callbackURL={safeTarget}
        newUserCallbackURL={safeTarget}
        errorCallbackURL="/login"
        googleEnabled={googleEnabled}
        disabled={busy}
        onStart={() => {
          setError(null);
          setInfo(null);
          setBusy(true);
        }}
        onError={(msg) => setError(msg)}
        onFinally={() => setBusy(false)}
      />
      <div className="auth-divider" aria-hidden="true">
        <span>atau masuk dengan email</span>
      </div>
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
          Belum punya akun? <Link href={registerHref}>Daftar sekarang</Link>
        </p>
      )}
    </section>
  );
}

export function RegisterForm({
  nextPath = "/library",
  googleEnabled,
  oauthError,
}: {
  nextPath?: string;
  googleEnabled: boolean;
  oauthError?: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    formatOAuthError(oauthError),
  );
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const safeTarget = sanitizeNextPath(nextPath, "/library");
  const loginHref =
    safeTarget !== "/library" && safeTarget !== "/"
      ? `/login?next=${encodeURIComponent(safeTarget)}`
      : "/login";

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
        if (
          res.error.code === "USER_ALREADY_EXISTS" ||
          res.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
        ) {
          setError(
            "Email tersebut sudah terdaftar. Silakan masuk atau gunakan email lain.",
          );
        } else if (res.error.code === "EMAIL_PASSWORD_SIGN_UP_DISABLED") {
          setError("Pendaftaran akun baru saat ini ditutup.");
        } else if (res.error.status === 429) {
          setError(
            "Terlalu banyak percobaan pendaftaran. Tunggu sebentar lalu coba lagi.",
          );
        } else {
          setError(res.error.message ?? "Pendaftaran gagal.");
        }
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
          <GoogleAuthButton
            mode="register"
            callbackURL={safeTarget}
            newUserCallbackURL={safeTarget}
            errorCallbackURL="/register"
            googleEnabled={googleEnabled}
            disabled={busy}
            onStart={() => {
              setError(null);
              setBusy(true);
            }}
            onError={(msg) => setError(msg)}
            onFinally={() => setBusy(false)}
          />
          <div className="auth-divider" aria-hidden="true">
            <span>atau daftar dengan email</span>
          </div>
          <form className="stack" onSubmit={onSubmit}>
            <label>
              Nama tampilan
              <input
                type="text"
                name="name"
                required
                maxLength={80}
                autoComplete="name"
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
        Sudah punya akun? <Link href={loginHref}>Masuk</Link>
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
