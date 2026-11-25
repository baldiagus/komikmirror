import { createHash, randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getAppOrigin, isPublicSignupAllowed } from "@/lib/env";
import { sendMail } from "@/lib/mailer";

const baseURL = getAppOrigin();
const rateLimitEnabled = process.env.AUTH_RATE_LIMIT_ENABLED !== "false";
const signInWindow = Number(process.env.AUTH_SIGNIN_RATE_LIMIT_WINDOW ?? 60);
const signInMax = Number(process.env.AUTH_SIGNIN_RATE_LIMIT_MAX ?? 10);

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const resolvedSecret =
  process.env.BETTER_AUTH_SECRET ||
  (isBuildPhase || process.env.NODE_ENV !== "production"
    ? "komik-mirror-nonprod-build-secret-do-not-use-in-prod-32chars"
    : undefined);

export const auth = betterAuth({
  baseURL,
  secret: resolvedSecret,
  trustedOrigins: [baseURL],
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    disableSignUp: !isPublicSignupAllowed(),
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      void sendMail({
        to: user.email,
        subject: "Reset kata sandi Komik Mirror",
        text: `Klik tautan berikut untuk mengatur ulang kata sandi akun Komik Mirror Anda (hanya berlaku sekali): ${url}`,
        html: `<p>Klik tautan berikut untuk mengatur ulang kata sandi akun Komik Mirror Anda:</p><p><a href="${url}">${url}</a></p>`,
      }).catch((err) => {
        console.error(
          "[Mailer] Failed to send password reset email:",
          err instanceof Error ? err.message : "Unknown error",
        );
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await db.insert(schema.verification).values({
        id: randomUUID(),
        identifier: `email-verify:${tokenHash}`,
        value: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      void sendMail({
        to: user.email,
        subject: "Verifikasi email Komik Mirror",
        text: `Klik tautan berikut untuk memverifikasi alamat email akun Komik Mirror Anda (hanya berlaku sekali): ${url}`,
        html: `<p>Klik tautan berikut untuk memverifikasi alamat email akun Komik Mirror Anda:</p><p><a href="${url}">${url}</a></p>`,
      }).catch((err) => {
        console.error(
          "[Mailer] Failed to send verification email:",
          err instanceof Error ? err.message : "Unknown error",
        );
      });
    },
  },
  rateLimit: {
    enabled: rateLimitEnabled,
    window: 60,
    max: 100,
    storage: "memory",
    customRules: {
      "/sign-in/email": {
        window: signInWindow,
        max: signInMax,
      },
      "/sign-up/email": {
        window: 60,
        max: 10,
      },
      "/request-password-reset": {
        window: 60,
        max: 10,
      },
    },
  },
  advanced: {
    useSecureCookies: baseURL.startsWith("https://"),
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    // nextCookies() MUST be the last plugin in the array.
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
