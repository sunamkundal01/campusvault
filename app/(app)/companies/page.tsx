import Link from "next/link";
import { db, schema } from "@/db";
import { asc, sql, eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/company-logo";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const rows = await db
    .select({
      id: schema.companies.id,
      name: schema.companies.name,
      slug: schema.companies.slug,
      hiringRole: schema.companies.hiringRole,
      oaCount: sql<number>`count(${schema.oaSets.id})`,
    })
    .from(schema.companies)
    .leftJoin(schema.oaSets, eq(schema.oaSets.companyId, schema.companies.id))
    .groupBy(schema.companies.id)
    .orderBy(asc(schema.companies.name));

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} companies indexed across all uploads.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            No companies yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((c) => (
            <Link key={c.id} href={`/companies/${c.slug}`}>
              <Card className="group h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/20">
                <CardContent className="flex items-center gap-3 p-4">
                  <CompanyLogo name={c.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    {c.hiringRole ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {c.hiringRole}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {c.oaCount} OA set{c.oaCount === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                  {c.oaCount > 0 && (
                    <Badge variant="secondary" className="font-mono">
                      {c.oaCount}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
