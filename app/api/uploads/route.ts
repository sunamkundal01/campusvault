import { NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { Readable } from "node:stream";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { uploadFile } from "@/lib/drive";
import { ALLOWED_MIME, PER_KIND_MAX_BYTES, checkUserQuotas } from "@/lib/quotas";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/ip";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!rateLimit(`upload:${session.user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const form = await req.formData();
  const oaSetId = String(form.get("oaSetId") ?? "");
  const showAttribution = form.get("showAttribution") === "true";
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (!oaSetId || files.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const oa = await db.query.oaSets.findFirst({ where: (t, { eq }) => eq(t.id, oaSetId) });
  if (!oa) return NextResponse.json({ error: "oa_set_not_found" }, { status: 404 });

  const addBytes = files.reduce((s, f) => s + f.size, 0);
  const q = await checkUserQuotas(session.user.id, addBytes);
  if (!q.ok) return NextResponse.json({ error: q.reason }, { status: 413 });

  const ip = clientIp(req);
  const created: { id: string; displayName: string }[] = [];

  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    const sniffed = await fileTypeFromBuffer(buf);
    const mime = sniffed?.mime ?? f.type;
    const kind = ALLOWED_MIME[mime];
    if (!kind) {
      return NextResponse.json(
        { error: `disallowed_mime`, details: { name: f.name, mime } },
        { status: 415 }
      );
    }
    if (buf.length > PER_KIND_MAX_BYTES[kind]) {
      return NextResponse.json(
        { error: `too_large`, details: { name: f.name, max: PER_KIND_MAX_BYTES[kind] } },
        { status: 413 }
      );
    }

    const safeName = f.name.replace(/[^\w.\-]/g, "_").slice(0, 120) || `upload-${Date.now()}`;
    const uploaded = await uploadFile({
      name: `${oaSetId}_${randomUUID()}_${safeName}`,
      mimeType: mime,
      body: Readable.from(buf),
    });

    const id = randomUUID();
    await db.insert(schema.files).values({
      id,
      oaSetId,
      driveFileId: uploaded.id,
      mimeType: mime,
      sizeBytes: buf.length,
      displayName: safeName,
      kind,
      sortOrder: 0,
      uploadedBy: session.user.id,
      showAttribution,
      status: "approved",
    });
    created.push({ id, displayName: safeName });
  }

  await audit({
    userId: session.user.id,
    action: "upload",
    resourceType: "oa_set",
    resourceId: oaSetId,
    ip,
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ files: created });
}
