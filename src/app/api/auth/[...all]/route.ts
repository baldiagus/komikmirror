import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { toNextJsHandler } from "better-auth/next-js";
import { db } from "@/db";
import { verification } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getAppOrigin } from "@/lib/env";

const handler = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/auth/verify-email") {
    const token = request.nextUrl.searchParams.get("token");
    if (token) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const [result] = await db
        .delete(verification)
        .where(eq(verification.identifier, `email-verify:${tokenHash}`));
      if (!result || result.affectedRows === 0) {
        const errorUrl = new URL("/verify-email", getAppOrigin());
        errorUrl.searchParams.set("error", "TOKEN_ALREADY_USED");
        return NextResponse.redirect(errorUrl);
      }
    }
  }
  return handler.GET(request);
}

export const POST = handler.POST;
