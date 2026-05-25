import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

interface MergeRule {
  canonical: string;
  aliases: string[];
}

/**
 * Canonical name on the left; every alias on the right gets folded into it.
 * Comparisons are case-insensitive on `name`. Canonical company is created if missing.
 */
const MERGES: MergeRule[] = [
  { canonical: "Futures First", aliases: ["FutureFirst", "Future first"] },
  { canonical: "Mathworks", aliases: ["mathwork", "MathWorks India Private Ltd"] },
  { canonical: "Accordion", aliases: ["Accordian", "accordion-Data engineering"] },
  { canonical: "Deloitte", aliases: ["Delloite"] },
  { canonical: "HiLabs", aliases: ["hilab"] },
  { canonical: "Info Edge", aliases: ["Infoedge"] },
  { canonical: "ION", aliases: ["Ion Group"] },
  { canonical: "Squarepoint Capital", aliases: ["Square Point"] },
  { canonical: "Texas Instruments", aliases: ["Texas instruments", "Texas", "TI"] },
  { canonical: "MakeMyTrip", aliases: ["MAKE MY TRIP"] },
  { canonical: "PhonePe", aliases: ["PhonePay"] },
  { canonical: "Eternal", aliases: ["Zomato (Eternal)"] },
  { canonical: "Media.net", aliases: ["Media .net", "media.net"] },
];

/**
 * Companies that came from misspelled / split-bleed names. Delete outright
 * (cascading any OA sets they own — which are content-empty in practice).
 */
const JUNK_NAMES = ["zanskar", "poleciy bazar", "seimens"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Look up an existing company by either slug match or lowercase-name match —
 * handles cases where two source names collapse to the same slug
 * (e.g. "Media .net" and "Media.net" both → "media-net").
 */
async function findCompanyId(name: string): Promise<string | null> {
  const slug = slugify(name);
  const r = await client.execute({
    sql: "SELECT id FROM companies WHERE slug = ? OR LOWER(name) = LOWER(?) LIMIT 1",
    args: [slug, name],
  });
  return (r.rows[0]?.id as string) ?? null;
}

/**
 * Ensures the canonical company exists with the chosen name.
 * If a company already lives at this slug under a different name,
 * its name is updated to the canonical (so renames like
 * "Media .net" → "Media.net" succeed without a UNIQUE collision).
 */
async function ensureCanonical(canonicalName: string): Promise<string> {
  const slug = slugify(canonicalName);
  const r = await client.execute({
    sql: "SELECT id, name FROM companies WHERE slug = ? LIMIT 1",
    args: [slug],
  });
  if (r.rows[0]) {
    const id = r.rows[0].id as string;
    if ((r.rows[0].name as string) !== canonicalName) {
      await client.execute({
        sql: "UPDATE companies SET name = ? WHERE id = ?",
        args: [canonicalName, id],
      });
      console.log(`  ↺ renamed slug "${slug}" → "${canonicalName}"`);
    }
    return id;
  }
  const id = crypto.randomUUID();
  await client.execute({
    sql: "INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)",
    args: [id, canonicalName, slug],
  });
  console.log(`  + created canonical "${canonicalName}"`);
  return id;
}

async function moveChildren(fromId: string, toId: string) {
  await client.execute({
    sql: "UPDATE oa_sets SET company_id = ? WHERE company_id = ?",
    args: [toId, fromId],
  });
  await client.execute({
    sql: "UPDATE placement_entries SET company_id = ? WHERE company_id = ?",
    args: [toId, fromId],
  });
}

async function deleteCompany(id: string) {
  await client.execute({ sql: "DELETE FROM companies WHERE id = ?", args: [id] });
}

async function pass1_merge() {
  console.log("\n— Pass 1: merge name variants —");
  let merged = 0;
  for (const { canonical, aliases } of MERGES) {
    const canonicalId = await ensureCanonical(canonical);
    for (const alias of aliases) {
      const aliasId = await findCompanyId(alias);
      if (!aliasId || aliasId === canonicalId) continue;
      await moveChildren(aliasId, canonicalId);
      await deleteCompany(aliasId);
      console.log(`  ↗ "${alias}" → "${canonical}"`);
      merged++;
    }
  }
  console.log(`  merged: ${merged}`);
}

async function pass2_junkAndEmpty() {
  console.log("\n— Pass 2: delete junk + empty companies —");
  let junkDeleted = 0;
  for (const name of JUNK_NAMES) {
    const id = await findCompanyId(name);
    if (id) {
      await deleteCompany(id);
      console.log(`  ✗ junk "${name}"`);
      junkDeleted++;
    }
  }
  const emptyRows = await client.execute(`
    SELECT c.id, c.name FROM companies c
    LEFT JOIN oa_sets o ON o.company_id = c.id
    LEFT JOIN placement_entries p ON p.company_id = c.id
    GROUP BY c.id
    HAVING COUNT(o.id) = 0 AND COUNT(p.id) = 0
  `);
  for (const row of emptyRows.rows) {
    await deleteCompany(row.id as string);
    console.log(`  ✗ empty "${row.name as string}"`);
  }
  console.log(`  junk deleted: ${junkDeleted}, empty deleted: ${emptyRows.rows.length}`);
}

function looksLikeAllLower(s: string): boolean {
  const trimmed = s.trim();
  if (!/[a-z]/.test(trimmed)) return false;
  return !/[A-Z]/.test(trimmed);
}

function titleCase(s: string): string {
  return s
    .split(/(\s+)/)
    .map((part) =>
      /\s/.test(part) || part.length === 0
        ? part
        : part[0].toUpperCase() + part.slice(1)
    )
    .join("");
}

async function pass3_titleCase() {
  console.log("\n— Pass 3: title-case all-lowercase names —");
  const r = await client.execute("SELECT id, name FROM companies");
  let changed = 0;
  for (const row of r.rows) {
    const name = row.name as string;
    if (!looksLikeAllLower(name)) continue;
    const fixed = titleCase(name).replace(/\s+/g, " ").trim();
    if (fixed !== name) {
      await client.execute({
        sql: "UPDATE companies SET name = ? WHERE id = ?",
        args: [fixed, row.id as string],
      });
      console.log(`  "${name}" → "${fixed}"`);
      changed++;
    }
  }
  console.log(`  retitled: ${changed}`);
}

async function summary() {
  const r = await client.execute(`
    SELECT
      (SELECT COUNT(*) FROM companies) c,
      (SELECT COUNT(*) FROM oa_sets) o,
      (SELECT COUNT(*) FROM oa_links) l,
      (SELECT COUNT(*) FROM placement_entries) p
  `);
  const row = r.rows[0];
  console.log("\n— Final counts —");
  console.log(`  companies:         ${row.c}`);
  console.log(`  oa_sets:           ${row.o}`);
  console.log(`  oa_links:          ${row.l}`);
  console.log(`  placement_entries: ${row.p}`);
}

async function main() {
  await pass1_merge();
  await pass2_junkAndEmpty();
  await pass3_titleCase();
  await summary();
  process.exit(0);
}

main().catch((e) => {
  console.error("cleanup failed:", e);
  process.exit(1);
});
