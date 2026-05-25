import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { InterviewsClient } from "./interviews-client";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const session = await auth();
  const companies = await db
    .select({ id: schema.companies.id, name: schema.companies.name })
    .from(schema.companies)
    .orderBy(asc(schema.companies.name));

  return (
    <InterviewsClient
      companies={companies}
      isAdmin={session?.user?.role === "admin"}
      currentUserName={session?.user?.name ?? null}
    />
  );
}
