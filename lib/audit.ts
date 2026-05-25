import { db, schema } from "@/db";
import { createHash } from "node:crypto";

export async function audit(args: {
  userId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const ipHash = args.ip
    ? createHash("sha256")
        .update(args.ip + (process.env.AUTH_SECRET ?? ""))
        .digest("hex")
        .slice(0, 32)
    : null;

  try {
    await db.insert(schema.auditLog).values({
      userId: args.userId ?? null,
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      ipHash,
      userAgent: args.userAgent ?? null,
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
