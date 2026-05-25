import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/ip";
import { COLLEGES } from "@/lib/colleges";

export const runtime = "nodejs";

const LinkInput = z.object({
  url: z.string().url().max(2000),
  label: z.string().max(120).optional(),
});

const Body = z
  .object({
    companyId: z.string().uuid().optional(),
    newCompanyName: z.string().min(1).max(80).optional(),
    title: z.string().min(1).max(200),
    college: z.enum(COLLEGES as [string, ...string[]]).optional(),
    year: z.number().int().min(2010).max(2100).optional(),
    conductedForBatch: z.number().int().min(2010).max(2100).optional(),
    durationMin: z.number().int().min(1).max(600).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    ctc: z.string().max(120).optional(),
    notes: z.string().max(20000).optional(),
    tagIds: z.array(z.string().uuid()).max(20).default([]),
    links: z.array(LinkInput).max(30).default([]),
    showAttribution: z.boolean().default(false),
  })
  .refine((v) => v.companyId || v.newCompanyName, { message: "company required" });

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`oa:${session.user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }

  let companyId = parsed.data.companyId;
  if (!companyId && parsed.data.newCompanyName) {
    const name = parsed.data.newCompanyName.trim();
    const slug = slugify(name);
    const existing = await db.query.companies.findFirst({ where: eq(schema.companies.slug, slug) });
    if (existing) {
      companyId = existing.id;
    } else {
      companyId = randomUUID();
      await db.insert(schema.companies).values({ id: companyId, name, slug });
    }
  }

  if (!companyId) return NextResponse.json({ error: "no_company" }, { status: 400 });

  const oaSetId = randomUUID();
  await db.insert(schema.oaSets).values({
    id: oaSetId,
    companyId,
    title: parsed.data.title,
    college: parsed.data.college,
    year: parsed.data.year,
    conductedForBatch: parsed.data.conductedForBatch,
    durationMin: parsed.data.durationMin,
    difficulty: parsed.data.difficulty,
    ctc: parsed.data.ctc,
    notes: parsed.data.notes,
    createdBy: session.user.id,
  });

  if (parsed.data.tagIds.length) {
    await db
      .insert(schema.oaSetTags)
      .values(parsed.data.tagIds.map((tagId) => ({ oaSetId, tagId })))
      .onConflictDoNothing();
  }

  if (parsed.data.links.length) {
    await db.insert(schema.oaLinks).values(
      parsed.data.links.map((l, i) => ({
        id: randomUUID(),
        oaSetId,
        url: l.url,
        label: l.label,
        addedBy: session.user.id,
        showAttribution: parsed.data.showAttribution,
        sortOrder: i,
        status: "approved" as const,
      }))
    );
  }

  await audit({
    userId: session.user.id,
    action: "create_oa_set",
    resourceType: "oa_set",
    resourceId: oaSetId,
    ip: clientIp(req),
  });

  return NextResponse.json({ oaSetId });
}
