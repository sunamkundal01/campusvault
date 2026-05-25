import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { extractYouTubeId } from "@/lib/youtube";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/ip";

export const runtime = "nodejs";

const Patch = z.object({
  title: z.string().min(3).max(160).optional(),
  content: z.string().min(20).max(40000).optional(),
  youtubeUrl: z.string().max(500).optional(),
  role: z.string().max(120).optional(),
  college: z.string().max(120).optional(),
  year: z.number().int().min(2010).max(2100).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await db.query.interviewExperiences.findFirst({
    where: eq(schema.interviewExperiences.id, id),
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Permissions:
  //  videos: admin only.
  //  blogs:  author or admin.
  const isAdmin = session.user.role === "admin";
  const isAuthor = existing.authorId === session.user.id;
  if (existing.kind === "video" && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (existing.kind === "blog" && !isAdmin && !isAuthor) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.role !== undefined) update.role = parsed.data.role;
  if (parsed.data.college !== undefined) update.college = parsed.data.college;
  if (parsed.data.year !== undefined) update.year = parsed.data.year;

  if (existing.kind === "video" && parsed.data.youtubeUrl) {
    const vid = extractYouTubeId(parsed.data.youtubeUrl);
    if (!vid) return NextResponse.json({ error: "invalid_youtube_url" }, { status: 400 });
    update.youtubeUrl = parsed.data.youtubeUrl;
    update.youtubeVideoId = vid;
  }
  if (existing.kind === "blog") {
    if (parsed.data.title) update.title = parsed.data.title;
    if (parsed.data.content) update.content = parsed.data.content;
  }

  await db.update(schema.interviewExperiences).set(update).where(eq(schema.interviewExperiences.id, id));

  await audit({
    userId: session.user.id,
    action: `update_interview_${existing.kind}`,
    resourceType: "interview",
    resourceId: id,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
}
