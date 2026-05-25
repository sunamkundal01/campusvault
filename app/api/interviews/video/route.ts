import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { COLLEGES } from "@/lib/colleges";
import { extractYouTubeId } from "@/lib/youtube";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/ip";

export const runtime = "nodejs";

const Body = z
  .object({
    companyId: z.string().uuid().optional(),
    newCompanyName: z.string().min(1).max(80).optional(),
    youtubeUrl: z.string().min(1).max(500),
    role: z.string().max(120).optional(),
    college: z.enum(COLLEGES as [string, ...string[]]).optional(),
    year: z.number().int().min(2010).max(2100).optional(),
  })
  .refine((v) => v.companyId || v.newCompanyName, { message: "company required" });

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!rateLimit(`interview-video:${session.user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const videoId = extractYouTubeId(parsed.data.youtubeUrl);
  if (!videoId) {
    return NextResponse.json({ error: "invalid_youtube_url" }, { status: 400 });
  }

  let companyId = parsed.data.companyId;
  if (!companyId && parsed.data.newCompanyName) {
    const name = parsed.data.newCompanyName.trim();
    const slug = slugify(name);
    const existing = await db.query.companies.findFirst({ where: eq(schema.companies.slug, slug) });
    companyId = existing?.id;
    if (!companyId) {
      companyId = randomUUID();
      await db.insert(schema.companies).values({ id: companyId, name, slug });
    }
  }
  if (!companyId) return NextResponse.json({ error: "no_company" }, { status: 400 });

  const id = randomUUID();
  await db.insert(schema.interviewExperiences).values({
    id,
    kind: "video",
    companyId,
    role: parsed.data.role,
    college: parsed.data.college,
    year: parsed.data.year,
    youtubeUrl: parsed.data.youtubeUrl,
    youtubeVideoId: videoId,
    authorId: session.user.id,
    authorName: session.user.name ?? "Admin",
    status: "approved",
  });

  await audit({
    userId: session.user.id,
    action: "create_interview_video",
    resourceType: "interview",
    resourceId: id,
    ip: clientIp(req),
  });

  return NextResponse.json({ id });
}
