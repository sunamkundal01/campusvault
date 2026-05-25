import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { ExploreClient } from "./explore-client";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const companies = await db
    .select({ id: schema.companies.id, name: schema.companies.name })
    .from(schema.companies)
    .orderBy(asc(schema.companies.name));

  return <ExploreClient companies={companies} />;
}
