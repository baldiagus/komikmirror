import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getMediaAccessRecord } from "@/dal/catalog";
import { resolveMediaAbsolutePath } from "@/lib/media";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const viewer = await getSessionUser();
  const access = await getMediaAccessRecord(id, viewer);

  if (!access.allowed) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  }

  let fullPath: string;
  try {
    fullPath = resolveMediaAbsolutePath(access.storageKey);
    const info = await stat(fullPath);
    if (!info.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }
    const stream = createReadStream(fullPath);
    const webStream = Readable.toWeb(stream) as ReadableStream;
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": access.mimeType,
        "Content-Length": String(info.size),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": access.isPublic
          ? "public, max-age=86400"
          : "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "X-Content-Type-Options": "nosniff" },
    });
  }
}
