import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { parseCollegeEmail } from "../lib/utils";

const FILE = resolve("./scripts/data/companies-seed.tsv");
const RESOURCE_COLS = 4; // url, role, year, college
const MAX_RESOURCES = 7;
const DEFAULT_ADMIN = "sunam_2022bcse039@nitsri.ac.in";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function stripCell(s: string | undefined): string {
  if (!s) return "";
  return s.trim().replace(/^"+|"+$/g, "").replace(/\s+/g, " ").trim();
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function ensureAdmin(): Promise<string> {
  const list = (process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN)
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const email = list[0];
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) {
    if (existing.role !== "admin") {
      await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, existing.id));
    }
    return existing.id;
  }
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
  console.log(`✓ created admin user ${email}`);
  return id;
}

async function ensureCompany(name: string): Promise<string> {
  const slug = slugify(name);
  const existing = await db.query.companies.findFirst({ where: eq(schema.companies.slug, slug) });
  if (existing) return existing.id;
  const id = randomUUID();
  await db.insert(schema.companies).values({ id, name, slug });
  console.log(`  + company "${name}"`);
  return id;
}

async function urlAlreadySeeded(url: string): Promise<boolean> {
  const found = await db.query.oaLinks.findFirst({ where: eq(schema.oaLinks.url, url) });
  return !!found;
}

function buildTitle(company: string, role: string, year: number | undefined): string {
  const parts = [company];
  if (role) parts.push(role);
  else parts.push("OA");
  if (year) parts.push(String(year));
  return parts.join(" — ");
}

async function main() {
  const raw = readFileSync(FILE, "utf8");
  const lines = raw.split(/\r?\n/).slice(2); // drop two header rows

  const adminId = await ensureAdmin();

  let companiesProcessed = 0;
  let oaSetsCreated = 0;
  let linksCreated = 0;
  let skipped = 0;
  let companiesSeen = new Set<string>();

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    const companyName = stripCell(cols[0]);
    if (!companyName) continue;

    const companyId = await ensureCompany(companyName);
    if (!companiesSeen.has(companyId)) {
      companiesSeen.add(companyId);
      companiesProcessed++;
    }

    for (let i = 0; i < MAX_RESOURCES; i++) {
      const base = 1 + i * RESOURCE_COLS;
      const url = stripCell(cols[base]);
      const role = stripCell(cols[base + 1]);
      const yearStr = stripCell(cols[base + 2]);
      const college = stripCell(cols[base + 3]);
      if (!url) continue;

      if (await urlAlreadySeeded(url)) {
        skipped++;
        continue;
      }

      const year = yearStr ? Number(yearStr) : undefined;
      const title = buildTitle(companyName, role, year);

      const oaSetId = randomUUID();
      await db.insert(schema.oaSets).values({
        id: oaSetId,
        companyId,
        title,
        college: college || null,
        year: year && !Number.isNaN(year) ? year : null,
        createdBy: adminId,
      });
      oaSetsCreated++;

      await db.insert(schema.oaLinks).values({
        id: randomUUID(),
        oaSetId,
        url,
        label: role || hostnameOf(url),
        addedBy: adminId,
        showAttribution: false,
        status: "approved",
        sortOrder: 0,
      });
      linksCreated++;
    }
  }

  console.log("");
  console.log(`✓ companies processed: ${companiesProcessed}`);
  console.log(`✓ OA sets created:     ${oaSetsCreated}`);
  console.log(`✓ links created:       ${linksCreated}`);
  console.log(`↺ already-seeded URLs: ${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("seed failed:", e);
  process.exit(1);
});
