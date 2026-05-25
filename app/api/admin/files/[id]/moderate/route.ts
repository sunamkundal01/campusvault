import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { deleteFile } from "@/lib/drive";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/ip";

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum(["approve", "reject", "remove"]),
  reason: z.string().max(500).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: fileId } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const file = await db.query.files.findFirst({ where: eq(schema.files.id, fileId) });
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (parsed.data.action === "approve") {
    await db
      .update(schema.files)
      .set({ status: "approved", rejectionReason: null })
      .where(eq(schema.files.id, fileId));
  } else if (parsed.data.action === "reject") {
    await db
      .update(schema.files)
      .set({ status: "rejected", rejectionReason: parsed.data.reason ?? null })
      .where(eq(schema.files.id, fileId));
  } else {
    // remove: delete bytes from Drive and mark removed
    try {
      await deleteFile(file.driveFileId);
    } catch (e) {
      console.error("[moderate] drive delete failed", e);
    }
    await db
      .update(schema.files)
      .set({ status: "removed", rejectionReason: parsed.data.reason ?? null })
      .where(eq(schema.files.id, fileId));
  }

  await audit({
    userId: session.user.id,
    action: `moderate:${parsed.data.action}`,
    resourceType: "file",
    resourceId: fileId,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
}
