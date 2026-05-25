import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BlockButton } from "./block-button";

export default async function AdminUsersPage() {
  const rows = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(200);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">{rows.length} known users.</p>
      </header>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Branch / Batch</th>
                <th className="p-3">Role</th>
                <th className="p-3">Last login</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">{u.email}</td>
                  <td className="p-3">
                    {u.branch?.toUpperCase() ?? "—"} · {u.batchYear ?? "—"}
                  </td>
                  <td className="p-3">
                    <Badge variant={u.role === "admin" ? "success" : "secondary"}>{u.role}</Badge>
                    {u.isBlocked && (
                      <Badge variant="destructive" className="ml-2">
                        blocked
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {u.lastLoginAt?.toLocaleString?.() ?? "—"}
                  </td>
                  <td className="p-3">
                    <BlockButton userId={u.id} isBlocked={u.isBlocked} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
