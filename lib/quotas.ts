import { db, schema } from "@/db";
import { and, eq, ne, sql } from "drizzle-orm";

const totalBytesCap = Number(process.env.QUOTA_BYTES_PER_USER ?? 524_288_000);
const dailyFilesCap = Number(process.env.QUOTA_FILES_PER_DAY ?? 20);

export const PER_KIND_MAX_BYTES = {
  pdf: Number(process.env.QUOTA_MAX_PDF_MB ?? 25) * 1024 * 1024,
  image: Number(process.env.QUOTA_MAX_IMG_MB ?? 5) * 1024 * 1024,
  zip: Number(process.env.QUOTA_MAX_ZIP_MB ?? 100) * 1024 * 1024,
  doc: Number(process.env.QUOTA_MAX_PDF_MB ?? 25) * 1024 * 1024,
  other: 5 * 1024 * 1024,
} as const;

export const ALLOWED_MIME: Record<string, keyof typeof PER_KIND_MAX_BYTES> = {
  "application/pdf": "pdf",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "doc",
};

export interface QuotaCheck {
  ok: boolean;
  reason?: string;
}

export async function checkUserQuotas(userId: string, addBytes: number): Promise<QuotaCheck> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [agg] = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.files.sizeBytes}), 0)`,
      today: sql<number>`coalesce(sum(case when ${schema.files.uploadedAt} >= ${Math.floor(
        since.getTime() / 1000
      )} then 1 else 0 end), 0)`,
    })
    .from(schema.files)
    .where(and(eq(schema.files.uploadedBy, userId), ne(schema.files.status, "removed")));

  if ((agg.total ?? 0) + addBytes > totalBytesCap) {
    return { ok: false, reason: `storage_cap_exceeded (limit ${totalBytesCap} bytes)` };
  }
  if ((agg.today ?? 0) >= dailyFilesCap) {
    return { ok: false, reason: `daily_files_cap_exceeded (limit ${dailyFilesCap}/day)` };
  }
  return { ok: true };
}
