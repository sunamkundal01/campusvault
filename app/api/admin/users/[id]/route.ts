import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/ip";

export const runtime = "nodejs";

const Body = z.object({ isBlocked: z.boolean().optional(), role: z.enum(["student", "admin"]).optional() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  await db
    .update(schema.users)
    .set({
      ...(parsed.data.isBlocked !== undefined ? { isBlocked: parsed.data.isBlocked } : {}),
      ...(parsed.data.role ? { role: parsed.data.role } : {}),
    })
    .where(eq(schema.users.id, id));

  await audit({
    userId: session.user.id,
    action: "admin_user_patch",
    resourceType: "user",
    resourceId: id,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
}
