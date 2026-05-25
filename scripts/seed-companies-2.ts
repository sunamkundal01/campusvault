import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { parseCollegeEmail } from "../lib/utils";

const FILE = resolve("./scripts/data/companies-seed-2.tsv");
const DEFAULT_ADMIN = "sunam_2022bcse039@nitsri.ac.in";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * TSV parser that understands `"..."` quoted cells with embedded newlines.
 * Doubled-quotes `""` inside a quoted cell escape a literal `"`.
 */
function parseTSV(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;
  let cellStart = true;
  let i = 0;
  while (i < content.length) {
    const c = content[i];
    if (inQuote) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuote = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }
    if (c === '"' && cellStart) {
      inQuote = true;
      cellStart = false;
      i++;
      continue;
    }
    cellStart = false;
    if (c === "\t") {
      row.push(cell);
      cell = "";
      cellStart = true;
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cellStart = true;
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    cell += c;
    i++;
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((x) => x.trim())) rows.push(row);
  }
  return rows;
}

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function extractCompanyFromName(raw: string): { name: string; role?: string } {
  const s = raw.trim();
  // "Name (role)"
  const paren = s.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (paren) return { name: paren[1].trim(), role: paren[2].trim() };
  // "Name:- role" or "Name: role"
  const colon = s.match(/^([^:]+?)\s*:\s*-?\s*(.+)$/);
  if (colon && colon[1].length > 1) return { name: colon[1].trim(), role: colon[2].trim() };
  return { name: s };
}

/**
 * Split on `+` / `,` only when outside parentheses, so role specs like
 * "Meesho (SDE-I, Data Scientist I, Business Analyst I)" stay intact.
 */
function splitOutsideParens(line: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && (c === "+" || c === ",")) {
      out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

function splitCompanies(rawField: string): { name: string; role?: string }[] {
  const result: { name: string; role?: string }[] = [];
  const lines = rawField
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    const parts = splitOutsideParens(line);
    for (const p of parts) {
      const ex = extractCompanyFromName(p);
      if (!ex.name || ex.name.length < 2) continue;
      // Reject names that are pure year/batch fragments like "2024 Batch"
      if (/^\d{4}\b/.test(ex.name)) continue;
      // Reject names containing unmatched parens (parse bleed-over)
      const open = (ex.name.match(/\(/g) ?? []).length;
      const close = (ex.name.match(/\)/g) ?? []).length;
      if (open !== close) continue;
      result.push(ex);
    }
  }
  return result;
}

function parseYear(date: string): number | undefined {
  if (!date) return undefined;
  const m = date.match(/(\d{4})/);
  if (m) {
    const y = Number(m[1]);
    if (y >= 2010 && y <= 2100) return y;
  }
  return undefined;
}

async function ensureAdmin(): Promise<string> {
  const list = (process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN)
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const email = list[0];
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) return existing.id;
  const parsed = parseCollegeEmail(email);
  const id = randomUUID();
  await db.insert(schema.users).values({
    id,
    email,
    name: email.split("@")[0],
    role: "admin",
    branch: parsed?.branch,
    batchYear: parsed?.batchYear,
  });
  return id;
}

async function ensureCompany(name: string): Promise<string> {
  const slug = slugify(name);
  if (!slug) return "";
  const existing = await db.query.companies.findFirst({ where: eq(schema.companies.slug, slug) });
  if (existing) return existing.id;
  const id = randomUUID();
  await db.insert(schema.companies).values({ id, name, slug });
  console.log(`  + company "${name}"`);
  return id;
}

async function urlExists(url: string): Promise<boolean> {
  const found = await db.query.oaLinks.findFirst({ where: eq(schema.oaLinks.url, url) });
  return !!found;
}

async function main() {
  const raw = readFileSync(FILE, "utf8");
  const rows = parseTSV(raw).slice(1); // drop header

  const adminId = await ensureAdmin();

  let rowsProcessed = 0;
  let rowsSkipped = 0;
  let oaSetsCreated = 0;
  let linksCreated = 0;

  for (const cols of rows) {
    const rawCompany = cols[0] ?? "";
    const college = (cols[1] ?? "").trim();
    const date = (cols[3] ?? "").trim();

    if (!rawCompany.trim() && !college) continue;

    const urls: string[] = [];
    const notesParts: string[] = [];
    for (let i = 2; i < cols.length; i++) {
      const v = (cols[i] ?? "").trim();
      if (!v) continue;
      if (i === 3) continue; // date column handled separately
      if (isUrl(v)) urls.push(v);
      else notesParts.push(v);
    }
    if (date) notesParts.unshift(`Date: ${date}`);
    const notes = notesParts.join(" · ").slice(0, 4000) || null;

    rowsProcessed++;

    // If row has URLs and every URL is already in DB, skip — already represented.
    if (urls.length > 0) {
      let anyNew = false;
      for (const u of urls) {
        if (!(await urlExists(u))) {
          anyNew = true;
          break;
        }
      }
      if (!anyNew) {
        rowsSkipped++;
        continue;
      }
    }

    const year = parseYear(date);
    const companies = splitCompanies(rawCompany);
    if (companies.length === 0) {
      rowsSkipped++;
      continue;
    }

    for (const c of companies) {
      const companyId = await ensureCompany(c.name);
      if (!companyId) continue;

      const titleParts = [c.name];
      titleParts.push(c.role || "OA");
      if (year) titleParts.push(String(year));
      const title = titleParts.join(" — ").slice(0, 200);

      const oaSetId = randomUUID();
      await db.insert(schema.oaSets).values({
        id: oaSetId,
        companyId,
        title,
        college: college || null,
        year: year ?? null,
        notes,
        createdBy: adminId,
      });
      oaSetsCreated++;

      for (const url of urls) {
        await db.insert(schema.oaLinks).values({
          id: randomUUID(),
          oaSetId,
          url,
          label: hostnameOf(url),
          addedBy: adminId,
          showAttribution: false,
          status: "approved",
          sortOrder: 0,
        });
        linksCreated++;
      }
    }
  }

  console.log("");
  console.log(`rows processed:    ${rowsProcessed}`);
  console.log(`rows skipped:      ${rowsSkipped} (no URLs new / no companies parsed)`);
  console.log(`OA sets created:   ${oaSetsCreated}`);
  console.log(`oa_links created:  ${linksCreated}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("seed-2 failed:", e);
  process.exit(1);
});
