import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/ip";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const AUTO_HIDE_THRESHOLD = 3;

const Body = z.object({
  reason: z.enum(["not_oa", "copyrighted", "low_quality", "offensive", "other"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: fileId } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const file = await db.query.files.findFirst({ where: eq(schema.files.id, fileId) });
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    await db.insert(schema.reports).values({
      id: randomUUID(),
      fileId,
      reporterId: session.user.id,
      reason: parsed.data.reason,
      note: parsed.data.note,
    });
  } catch {
    return NextResponse.json({ error: "already_reported" }, { status: 409 });
  }

  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(schema.reports)
    .where(eq(schema.reports.fileId, fileId));

  const update: Partial<typeof schema.files.$inferInsert> = { reportCount: cnt };
  if (cnt >= AUTO_HIDE_THRESHOLD && file.status === "approved") update.status = "pending";
  await db.update(schema.files).set(update).where(eq(schema.files.id, fileId));

  await audit({
    userId: session.user.id,
    action: "report_file",
    resourceType: "file",
    resourceId: fileId,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, reportCount: cnt, autoHidden: cnt >= AUTO_HIDE_THRESHOLD });
}
