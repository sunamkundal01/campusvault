import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { ContributeForm } from "./contribute-form";

export default async function ContributePage() {
  const [companies, tags] = await Promise.all([
    db
      .select({ id: schema.companies.id, name: schema.companies.name, slug: schema.companies.slug })
      .from(schema.companies)
      .orderBy(asc(schema.companies.name)),
    db.select({ id: schema.tags.id, name: schema.tags.name }).from(schema.tags).orderBy(asc(schema.tags.name)),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Contribute</h1>
        <p className="text-sm text-muted-foreground">
          Share an OA you took or remember. Your name stays hidden unless you opt in.
        </p>
      </header>

      <ContributeForm companies={companies} tags={tags} />
    </div>
  );
}
