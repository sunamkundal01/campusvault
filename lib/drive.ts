import { google, type drive_v3 } from "googleapis";
import { Readable } from "node:stream";

let cached: drive_v3.Drive | null = null;

function client(): drive_v3.Drive {
  if (cached) return cached;
  const b64 = process.env.DRIVE_SA_KEY_B64;
  if (!b64) throw new Error("DRIVE_SA_KEY_B64 is not configured");
  const credentials = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  cached = google.drive({ version: "v3", auth });
  return cached;
}

export interface DriveStreamArgs {
  fileId: string;
  range?: string | null;
}

export interface DriveStreamResult {
  stream: Readable;
  status: number;
  headers: Record<string, string>;
}

/** Streams a file from Drive (service-account owned), forwarding Range. */
export async function streamFile({ fileId, range }: DriveStreamArgs): Promise<DriveStreamResult> {
  const drive = client();
  const req = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    {
      responseType: "stream",
      headers: range ? { Range: range } : undefined,
      validateStatus: () => true,
    }
  );
  const headers: Record<string, string> = {};
  const allow = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];
  for (const h of allow) {
    const v = req.headers[h];
    if (typeof v === "string") headers[h] = v;
  }
  return { stream: req.data as Readable, status: req.status, headers };
}

export async function getFileMeta(fileId: string) {
  const drive = client();
  const res = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, md5Checksum, owners(emailAddress)",
    supportsAllDrives: true,
  });
  return res.data;
}

/** Upload a buffer/stream to the parent folder, owned by the service account. */
export async function uploadFile(args: {
  name: string;
  mimeType: string;
  body: Readable | Buffer;
}): Promise<{ id: string; size: number }> {
  const drive = client();
  const parent = process.env.DRIVE_PARENT_FOLDER_ID;
  if (!parent) throw new Error("DRIVE_PARENT_FOLDER_ID is not configured");
  const body = Buffer.isBuffer(args.body) ? Readable.from(args.body) : args.body;
  const res = await drive.files.create({
    requestBody: { name: args.name, parents: [parent], mimeType: args.mimeType },
    media: { mimeType: args.mimeType, body },
    fields: "id, size",
    supportsAllDrives: true,
  });
  return { id: res.data.id!, size: Number(res.data.size ?? 0) };
}

export async function deleteFile(fileId: string) {
  const drive = client();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}
