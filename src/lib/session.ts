import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role ?? "user",
    emailVerified: Boolean(session.user.emailVerified),
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "Silakan masuk untuk melanjutkan.");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new AppError(
      "FORBIDDEN",
      "Anda tidak memiliki izin admin untuk tindakan ini.",
    );
  }
  return user;
}
