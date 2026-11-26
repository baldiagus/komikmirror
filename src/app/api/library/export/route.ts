import { NextResponse } from "next/server";
import { exportUserLibrarySnapshot } from "@/dal/account";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getSessionUser();
  if (!viewer) {
    return NextResponse.json(
      { error: "Silakan masuk untuk mengekspor pustaka Anda." },
      { status: 401 },
    );
  }

  const snapshot = await exportUserLibrarySnapshot(viewer.id);
  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="komik-mirror-library.json"',
      "Cache-Control": "no-store",
    },
  });
}
