import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/ip";

export const runtime = "nodejs";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await db
    .update(schema.interviewExperiences)
    .set({ status: "removed" })
    .where(eq(schema.interviewExperiences.id, id));

  await audit({
    userId: session.user.id,
    action: "moderate:remove_interview",
    resourceType: "interview",
    resourceId: id,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
}
