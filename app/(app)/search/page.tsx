import Link from "next/link";
import { db, schema } from "@/db";
import { eq, like, or, desc, sql } from "drizzle-orm";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = `%${q.trim()}%`;

  const results = q
    ? await db
        .select({
          id: schema.oaSets.id,
          title: schema.oaSets.title,
          year: schema.oaSets.year,
          companyName: schema.companies.name,
          companySlug: schema.companies.slug,
        })
        .from(schema.oaSets)
        .innerJoin(schema.companies, eq(schema.oaSets.companyId, schema.companies.id))
        .where(
          or(
            like(sql`lower(${schema.oaSets.title})`, term.toLowerCase()),
            like(sql`lower(${schema.oaSets.notes})`, term.toLowerCase()),
            like(sql`lower(${schema.companies.name})`, term.toLowerCase())
          )
        )
        .orderBy(desc(schema.oaSets.createdAt))
        .limit(50)
    : [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">Search across OAs and companies.</p>
      </header>

      <form>
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search companies, OA titles, notes…"
          className="h-12 text-base"
        />
      </form>

      {q && (
        <div className="text-xs text-muted-foreground">
          {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
        </div>
      )}

      <div className="grid gap-3">
        {results.map((r) => (
          <Link key={r.id} href={`/oa/${r.id}`}>
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-xs text-muted-foreground">{r.companyName}</div>
                  <div className="font-medium">{r.title}</div>
                </div>
                {r.year && <Badge variant="outline">{r.year}</Badge>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
