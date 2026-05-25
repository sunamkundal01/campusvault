import { SignJWT, jwtVerify } from "jose";
import { createHash, randomUUID } from "node:crypto";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const TTL_SECONDS = 60;

function key() {
  const s = process.env.VIEW_TOKEN_SECRET;
  if (!s) throw new Error("VIEW_TOKEN_SECRET is not configured");
  return new TextEncoder().encode(s);
}

export function ipHash(ip: string | null | undefined) {
  if (!ip) return "";
  return createHash("sha256")
    .update(ip + (process.env.AUTH_SECRET ?? ""))
    .digest("hex")
    .slice(0, 24);
}

export async function issueViewToken(args: {
  userId: string;
  fileId: string;
  ip: string | null;
}): Promise<string> {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);

  await db.insert(schema.viewTokens).values({
    jti,
    userId: args.userId,
    fileId: args.fileId,
    expiresAt,
    consumed: false,
  });

  return await new SignJWT({ uid: args.userId, fid: args.fileId, iph: ipHash(args.ip) })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(key());
}

export interface VerifiedViewToken {
  jti: string;
  userId: string;
  fileId: string;
  ipHash: string;
}

export async function verifyAndConsumeViewToken(
  token: string,
  observedIp: string | null
): Promise<VerifiedViewToken> {
  const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
  if (!payload.jti || !payload.uid || !payload.fid) throw new Error("invalid_token");

  const row = await db.query.viewTokens.findFirst({
    where: eq(schema.viewTokens.jti, payload.jti as string),
  });
  if (!row) throw new Error("unknown_token");
  if (row.consumed) throw new Error("already_used");
  if (row.expiresAt.getTime() < Date.now()) throw new Error("expired");

  if (payload.iph && payload.iph !== ipHash(observedIp)) throw new Error("ip_mismatch");

  await db
    .update(schema.viewTokens)
    .set({ consumed: true })
    .where(eq(schema.viewTokens.jti, payload.jti as string));

  return {
    jti: payload.jti as string,
    userId: payload.uid as string,
    fileId: payload.fid as string,
    ipHash: (payload.iph as string) ?? "",
  };
}

export async function purgeExpiredTokens() {
  await db.delete(schema.viewTokens).where(eq(schema.viewTokens.consumed, true));
}
