import { NextRequest, NextResponse } from "next/server";
import { searchPublishedQuick } from "@/dal/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchPublishedQuick(q);
  return NextResponse.json(
    { results },
    { headers: { "X-Content-Type-Options": "nosniff" } },
  );
}
