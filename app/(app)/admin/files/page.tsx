import Link from "next/link";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModerateButtons } from "./moderate-buttons";

export default async function AdminFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "pending" } = await searchParams;
  const filter = ["pending", "approved", "rejected", "removed"].includes(status)
    ? (status as "pending" | "approved" | "rejected" | "removed")
    : "pending";

  const rows = await db
    .select({
      file: schema.files,
      oaTitle: schema.oaSets.title,
      oaId: schema.oaSets.id,
      uploaderEmail: schema.users.email,
      uploaderName: schema.users.name,
    })
    .from(schema.files)
    .innerJoin(schema.oaSets, eq(schema.files.oaSetId, schema.oaSets.id))
    .leftJoin(schema.users, eq(schema.files.uploadedBy, schema.users.id))
    .where(eq(schema.files.status, filter))
    .orderBy(desc(schema.files.uploadedAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Files — {filter}</h1>
        <nav className="flex gap-2 text-sm">
          {(["pending", "approved", "rejected", "removed"] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/files?status=${s}`}
              className={
                "rounded-md border px-3 py-1.5 " +
                (filter === s ? "bg-primary text-primary-foreground" : "hover:bg-accent")
              }
            >
              {s}
            </Link>
          ))}
        </nav>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nothing here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <Card key={r.file.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4 text-sm">
                <div className="min-w-0">
                  <Link href={`/oa/${r.oaId}`} className="font-medium hover:underline">
                    {r.file.displayName}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {r.oaTitle} · by{" "}
                    <span className="font-mono">{r.uploaderEmail ?? "—"}</span> ·{" "}
                    {r.file.reportCount > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {r.file.reportCount} report{r.file.reportCount === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                </div>
                <ModerateButtons fileId={r.file.id} status={r.file.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
