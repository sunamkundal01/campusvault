import Link from "next/link";
import { db, schema } from "@/db";
import { eq, sql, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage() {
  const [users, files, pending, reports, recentActions] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(schema.users),
    db.select({ n: sql<number>`count(*)` }).from(schema.files),
    db.select({ n: sql<number>`count(*)` }).from(schema.files).where(eq(schema.files.status, "pending")),
    db.select({ n: sql<number>`count(*)` }).from(schema.reports),
    db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(20),
  ]);

  const tiles = [
    { label: "Users", value: users[0]?.n ?? 0, href: "/admin/users" },
    { label: "Files", value: files[0]?.n ?? 0, href: "/admin/files" },
    { label: "Pending review", value: pending[0]?.n ?? 0, href: "/admin/files?status=pending" },
    { label: "Total reports", value: reports[0]?.n ?? 0, href: "/admin/files?status=pending" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Moderation, users, and audit.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</div>
                <div className="mt-1 text-3xl font-semibold">{t.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y text-sm">
              {recentActions.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{a.action}</span>
                    <span className="text-muted-foreground">
                      {a.resourceType ?? ""} {a.resourceId ?? ""}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.createdAt?.toLocaleString?.() ?? ""}
                  </div>
                </li>
              ))}
              {recentActions.length === 0 && (
                <li className="p-6 text-center text-sm text-muted-foreground">No activity yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
