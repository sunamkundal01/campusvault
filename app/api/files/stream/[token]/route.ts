import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { verifyAndConsumeViewToken } from "@/lib/tokens";
import { streamFile } from "@/lib/drive";
import { clientIp } from "@/lib/ip";
import { audit } from "@/lib/audit";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HARDENED_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
};

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const ip = clientIp(req);

  let verified;
  try {
    verified = await verifyAndConsumeViewToken(token, ip);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "invalid";
    return new NextResponse(`Forbidden: ${reason}`, { status: 403, headers: HARDENED_HEADERS });
  }

  const file = await db.query.files.findFirst({ where: eq(schema.files.id, verified.fileId) });
  if (!file || file.status !== "approved") {
    return new NextResponse("Not found", { status: 404, headers: HARDENED_HEADERS });
  }

  const range = req.headers.get("range");
  const drive = await streamFile({ fileId: file.driveFileId, range });

  await audit({
    userId: verified.userId,
    action: "view_file_stream",
    resourceType: "file",
    resourceId: file.id,
    ip,
    userAgent: req.headers.get("user-agent"),
  });

  const headers: Record<string, string> = {
    ...HARDENED_HEADERS,
    "Content-Type": drive.headers["content-type"] ?? file.mimeType,
    "Content-Disposition": `inline; filename="${file.displayName.replace(/"/g, "")}"`,
    "Accept-Ranges": drive.headers["accept-ranges"] ?? "bytes",
  };
  if (drive.headers["content-length"]) headers["Content-Length"] = drive.headers["content-length"];
  if (drive.headers["content-range"]) headers["Content-Range"] = drive.headers["content-range"];

  return new NextResponse(Readable.toWeb(drive.stream) as ReadableStream, {
    status: drive.status,
    headers,
  });
}
