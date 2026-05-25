import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

/**
 * Normalize a URL so trivial variants collapse to the same key:
 *  - lowercase scheme and host
 *  - drop query string and fragment
 *  - strip `/u/<n>/` account-index segments (Drive)
 *  - strip trailing `/view` `/preview` `/edit` (Drive)
 *  - strip trailing slash
 */
function normalizeUrl(raw: string): string {
  let url = raw.trim();
  try {
    const u = new URL(url);
    let path = u.pathname;
    path = path.replace(/\/u\/\d+\//, "/");
    path = path.replace(/\/(view|preview|edit)\/?$/i, "");
    path = path.replace(/\/+$/, "");
    return `${u.protocol.toLowerCase()}//${u.hostname.toLowerCase()}${path}`;
  } catch {
    return url.toLowerCase();
  }
}

interface LinkRow {
  link_id: string;
  url: string;
  oa_set_id: string;
  oa_created_at: number;
  company_id: string;
  company_name: string;
  oa_notes: string | null;
}

async function main() {
  console.log("— Loading all links —");
  const r = await client.execute(`
    SELECT
      l.id          AS link_id,
      l.url         AS url,
      l.oa_set_id   AS oa_set_id,
      o.created_at  AS oa_created_at,
      o.company_id  AS company_id,
      c.name        AS company_name,
      o.notes       AS oa_notes
    FROM oa_links l
    JOIN oa_sets  o ON o.id = l.oa_set_id
    JOIN companies c ON c.id = o.company_id
  `);
  const rows = r.rows as unknown as LinkRow[];
  console.log(`  loaded ${rows.length} links`);

  // Group by (company_id, normalized url)
  const groups = new Map<string, LinkRow[]>();
  for (const row of rows) {
    const key = `${row.company_id}::${normalizeUrl(row.url)}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`  duplicate groups: ${dupGroups.length}`);
  if (dupGroups.length === 0) {
    console.log("nothing to clean ✓");
    process.exit(0);
  }

  let linksDeleted = 0;
  let oaSetsDeleted = 0;

  for (const group of dupGroups) {
    // Keep the link tied to the oldest oa_set
    group.sort((a, b) => Number(a.oa_created_at) - Number(b.oa_created_at));
    const [keeper, ...losers] = group;

    console.log(
      `\n${keeper.company_name}  (×${group.length})  ${normalizeUrl(keeper.url)}`
    );
    console.log(`  ✓ keep link in oa_set ${keeper.oa_set_id.slice(0, 8)}…`);

    for (const loser of losers) {
      if (loser.link_id === keeper.link_id) continue;
      await client.execute({
        sql: "DELETE FROM oa_links WHERE id = ?",
        args: [loser.link_id],
      });
      linksDeleted++;
      console.log(`  ✗ drop link in oa_set ${loser.oa_set_id.slice(0, 8)}…`);

      // If parent oa_set is now empty (no links, no files, no notes), drop it.
      const linkCount = await client.execute({
        sql: "SELECT COUNT(*) AS n FROM oa_links WHERE oa_set_id = ?",
        args: [loser.oa_set_id],
      });
      const fileCount = await client.execute({
        sql: "SELECT COUNT(*) AS n FROM files WHERE oa_set_id = ?",
        args: [loser.oa_set_id],
      });
      const hasContent =
        Number(linkCount.rows[0].n) > 0 ||
        Number(fileCount.rows[0].n) > 0 ||
        !!(loser.oa_notes && loser.oa_notes.trim());

      if (!hasContent) {
        await client.execute({
          sql: "DELETE FROM oa_sets WHERE id = ?",
          args: [loser.oa_set_id],
        });
        oaSetsDeleted++;
        console.log(`     also dropped empty oa_set`);
      }
    }
  }

  const final = await client.execute(`
    SELECT
      (SELECT COUNT(*) FROM oa_links) l,
      (SELECT COUNT(*) FROM oa_sets) o,
      (SELECT COUNT(*) FROM companies) c
  `);
  console.log("");
  console.log(`links deleted:   ${linksDeleted}`);
  console.log(`oa_sets deleted: ${oaSetsDeleted}`);
  console.log("final counts:", {
    companies: final.rows[0].c,
    oa_sets: final.rows[0].o,
    oa_links: final.rows[0].l,
  });
  process.exit(0);
}

main().catch((e) => {
  console.error("dedupe failed:", e);
  process.exit(1);
});
