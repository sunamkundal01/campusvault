import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/ip";
import { COLLEGES } from "@/lib/colleges";

export const runtime = "nodejs";

const Body = z
  .object({
    companyId: z.string().uuid().optional(),
    newCompanyName: z.string().min(1).max(80).optional(),
    role: z.string().min(1).max(120),
    college: z.enum(COLLEGES as [string, ...string[]]),
    entryType: z.enum(["entry", "intern", "fte", "ppo"]).default("entry"),
    oaDate: z.string().max(120).optional(),
    ctc: z.string().max(120).optional(),
    cgpaCriteria: z.string().max(60).optional(),
    mtechEligible: z.boolean().nullable().optional(),
    notes: z.string().max(2000).optional(),
    showAttribution: z.boolean().default(false),
  })
  .refine((v) => v.companyId || v.newCompanyName, { message: "company required" });

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 60));

  // --- 1. Placement entries -------------------------------------------------
  const placementConds = [eq(schema.placementEntries.status, "approved" as const)];
  if (q) {
    const term = `%${q}%`;
    placementConds.push(
      or(
        like(sql`lower(${schema.placementEntries.role})`, term),
        like(sql`lower(${schema.placementEntries.college})`, term),
        like(sql`lower(${schema.companies.name})`, term)
      )!
    );
  }

  const placementRows = await db
    .select({
      id: schema.placementEntries.id,
      companyName: schema.companies.name,
      role: schema.placementEntries.role,
      college: schema.placementEntries.college,
      entryType: schema.placementEntries.entryType,
      oaDate: schema.placementEntries.oaDate,
      ctc: schema.placementEntries.ctc,
      cgpaCriteria: schema.placementEntries.cgpaCriteria,
      mtechEligible: schema.placementEntries.mtechEligible,
      notes: schema.placementEntries.notes,
      createdAt: schema.placementEntries.createdAt,
    })
    .from(schema.placementEntries)
    .innerJoin(schema.companies, eq(schema.placementEntries.companyId, schema.companies.id))
    .where(and(...placementConds))
    .orderBy(desc(schema.placementEntries.createdAt))
    .limit(limit);

  // --- 2. OA contributions (cross-listed on Explore) -----------------------
  const oaConds = [];
  if (q) {
    const term = `%${q}%`;
    oaConds.push(
      or(
        like(sql`lower(${schema.oaSets.title})`, term),
        like(sql`lower(${schema.oaSets.college})`, term),
        like(sql`lower(${schema.companies.name})`, term)
      )!
    );
  }

  const oaRows = await db
    .select({
      id: schema.oaSets.id,
      companyName: schema.companies.name,
      title: schema.oaSets.title,
      college: schema.oaSets.college,
      year: schema.oaSets.year,
      conductedForBatch: schema.oaSets.conductedForBatch,
      durationMin: schema.oaSets.durationMin,
      difficulty: schema.oaSets.difficulty,
      ctc: schema.oaSets.ctc,
      notes: schema.oaSets.notes,
      createdAt: schema.oaSets.createdAt,
    })
    .from(schema.oaSets)
    .innerJoin(schema.companies, eq(schema.oaSets.companyId, schema.companies.id))
    .where(oaConds.length ? and(...oaConds) : undefined)
    .orderBy(desc(schema.oaSets.createdAt))
    .limit(limit);

  // --- 3. Normalize both shapes to a single card payload --------------------
  const placementCards = placementRows.map((r) => ({
    kind: "placement" as const,
    id: r.id,
    companyName: r.companyName,
    role: r.role,
    college: r.college,
    entryType: r.entryType,
    oaDate: r.oaDate,
    ctc: r.ctc,
    cgpaCriteria: r.cgpaCriteria,
    mtechEligible: r.mtechEligible,
    notes: r.notes,
    createdAt: r.createdAt,
    linkHref: null as string | null,
  }));

  const oaCards = oaRows.map((r) => {
    const oaSummary = [
      r.year && `Year ${r.year}`,
      r.conductedForBatch && `Batch ${r.conductedForBatch}`,
      r.durationMin && `${r.durationMin} min`,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      kind: "oa" as const,
      id: r.id,
      companyName: r.companyName,
      role: r.title,
      college: r.college ?? "—",
      entryType: "oa" as const,
      oaDate: oaSummary || null,
      ctc: r.ctc,
      cgpaCriteria: null,
      mtechEligible: null,
      notes: r.notes,
      createdAt: r.createdAt,
      linkHref: `/oa/${r.id}`,
    };
  });

  const merged = [...placementCards, ...oaCards]
    .sort((a, b) => {
      const at = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bt = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return bt - at;
    })
    .slice(0, limit);

  return NextResponse.json({ entries: merged, total: merged.length });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`placements:${session.user.id}`, 20, 60_000)) {
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
    if (existing) companyId = existing.id;
    else {
      companyId = randomUUID();
      await db.insert(schema.companies).values({ id: companyId, name, slug });
    }
  }
  if (!companyId) return NextResponse.json({ error: "no_company" }, { status: 400 });

  const id = randomUUID();
  await db.insert(schema.placementEntries).values({
    id,
    companyId,
    role: parsed.data.role,
    college: parsed.data.college,
    entryType: parsed.data.entryType,
    oaDate: parsed.data.oaDate,
    ctc: parsed.data.ctc,
    cgpaCriteria: parsed.data.cgpaCriteria,
    mtechEligible: parsed.data.mtechEligible ?? null,
    notes: parsed.data.notes,
    uploadedBy: session.user.id,
    showAttribution: parsed.data.showAttribution,
    status: "approved",
  });

  await audit({
    userId: session.user.id,
    action: "create_placement",
    resourceType: "placement_entry",
    resourceId: id,
    ip: clientIp(req),
  });

  return NextResponse.json({ id });
}
