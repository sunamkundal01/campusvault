import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { COLLEGES } from "@/lib/colleges";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/ip";

export const runtime = "nodejs";

const Body = z
  .object({
    companyId: z.string().uuid().optional(),
    newCompanyName: z.string().min(1).max(80).optional(),
    title: z.string().min(3).max(160),
    content: z.string().min(20).max(40000),
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
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`interview-blog:${session.user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }

  // Compulsory attribution: derive author name from session.
  const authorName =
    session.user.name?.trim() ||
    session.user.email?.split("@")[0] ||
    "NIT Srinagar student";

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
    kind: "blog",
    companyId,
    role: parsed.data.role,
    college: parsed.data.college,
    year: parsed.data.year,
    title: parsed.data.title,
    content: parsed.data.content,
    authorId: session.user.id,
    authorName,
    status: "approved",
  });

  await audit({
    userId: session.user.id,
    action: "create_interview_blog",
    resourceType: "interview",
    resourceId: id,
    ip: clientIp(req),
  });

  return NextResponse.json({ id });
}
