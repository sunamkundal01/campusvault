import { NextResponse } from "next/server";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind");
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 60));

  const conditions = [eq(schema.interviewExperiences.status, "approved" as const)];
  if (kindParam === "video" || kindParam === "blog") {
    conditions.push(eq(schema.interviewExperiences.kind, kindParam));
  }
  if (q) {
    const term = `%${q}%`;
    conditions.push(
      or(
        like(sql`lower(${schema.interviewExperiences.title})`, term),
        like(sql`lower(${schema.interviewExperiences.role})`, term),
        like(sql`lower(${schema.interviewExperiences.college})`, term),
        like(sql`lower(${schema.interviewExperiences.authorName})`, term),
        like(sql`lower(${schema.companies.name})`, term)
      )!
    );
  }

  const rows = await db
    .select({
      id: schema.interviewExperiences.id,
      kind: schema.interviewExperiences.kind,
      companyName: schema.companies.name,
      role: schema.interviewExperiences.role,
      college: schema.interviewExperiences.college,
      year: schema.interviewExperiences.year,
      youtubeVideoId: schema.interviewExperiences.youtubeVideoId,
      title: schema.interviewExperiences.title,
      contentSnippet: sql<string>`substr(coalesce(${schema.interviewExperiences.content}, ''), 1, 280)`,
      authorName: schema.interviewExperiences.authorName,
      createdAt: schema.interviewExperiences.createdAt,
    })
    .from(schema.interviewExperiences)
    .innerJoin(schema.companies, eq(schema.interviewExperiences.companyId, schema.companies.id))
    .where(and(...conditions))
    .orderBy(desc(schema.interviewExperiences.createdAt))
    .limit(limit);

  return NextResponse.json({ entries: rows });
}
