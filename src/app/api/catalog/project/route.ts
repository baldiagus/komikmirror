import { NextRequest, NextResponse } from "next/server";
import { getProjectBatch, PROJECT_BATCH_SIZE } from "@/dal/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const jenis = Number(searchParams.get("jenis") ?? "0");
  const offset = Number(searchParams.get("offset") ?? "0");
  const limit = Number(searchParams.get("limit") ?? String(PROJECT_BATCH_SIZE));

  const batch = await getProjectBatch(
    Number.isFinite(jenis) ? jenis : 0,
    Number.isFinite(offset) ? offset : 0,
    Number.isFinite(limit) ? limit : PROJECT_BATCH_SIZE,
  );
  return NextResponse.json(batch, {
    headers: { "X-Content-Type-Options": "nosniff" },
  });
}
