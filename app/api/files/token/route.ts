import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { issueViewToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { audit } from "@/lib/audit";

const Body = z.object({ fileId: z.string().uuid() });

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!rateLimit(`tok:${session.user.id}`, 60, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const file = await db.query.files.findFirst({
    where: and(eq(schema.files.id, parsed.data.fileId), eq(schema.files.status, "approved")),
  });
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ip = clientIp(req);
  const token = await issueViewToken({ userId: session.user.id, fileId: file.id, ip });
  await audit({
    userId: session.user.id,
    action: "view_file_request",
    resourceType: "file",
    resourceId: file.id,
    ip,
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({
    token,
    mimeType: file.mimeType,
    kind: file.kind,
    sizeBytes: file.sizeBytes,
    displayName: file.displayName,
  });
}
