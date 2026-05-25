import Link from "next/link";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";

export default async function MyUploadsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const rows = await db
    .select({
      file: schema.files,
      oaTitle: schema.oaSets.title,
      oaId: schema.oaSets.id,
      companyName: schema.companies.name,
    })
    .from(schema.files)
    .innerJoin(schema.oaSets, eq(schema.files.oaSetId, schema.oaSets.id))
    .innerJoin(schema.companies, eq(schema.oaSets.companyId, schema.companies.id))
    .where(eq(schema.files.uploadedBy, session.user.id))
    .orderBy(desc(schema.files.uploadedAt));

  const total = rows.reduce((s, r) => s + (r.file.status !== "removed" ? r.file.sizeBytes : 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">My uploads</h1>
        <p className="text-sm text-muted-foreground">
          Total storage used: <span className="font-mono">{formatBytes(total)}</span>
        </p>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            You haven't uploaded anything yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <Link key={r.file.id} href={`/oa/${r.oaId}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.file.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.companyName} · {r.oaTitle} ·{" "}
                      <span className="font-mono">{formatBytes(r.file.sizeBytes)}</span>
                    </div>
                  </div>
                  <StatusBadge status={r.file.status} reports={r.file.reportCount} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, reports }: { status: string; reports: number }) {
  if (status === "approved")
    return (
      <Badge variant="success">
        Live {reports > 0 && `· ${reports} report${reports === 1 ? "" : "s"}`}
      </Badge>
    );
  if (status === "pending") return <Badge variant="warning">Pending review</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Removed</Badge>;
}
