import { notFound } from "next/navigation";
import Link from "next/link";
import { db, schema } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { OaViewer } from "./oa-viewer";

export default async function OaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const oa = await db.query.oaSets.findFirst({ where: eq(schema.oaSets.id, id) });
  if (!oa) notFound();

  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, oa.companyId) });

  const files = await db.query.files.findMany({
    where: and(eq(schema.files.oaSetId, oa.id), eq(schema.files.status, "approved")),
    orderBy: [asc(schema.files.sortOrder), asc(schema.files.uploadedAt)],
  });

  const links = await db.query.oaLinks.findMany({
    where: and(eq(schema.oaLinks.oaSetId, oa.id), eq(schema.oaLinks.status, "approved")),
    orderBy: [asc(schema.oaLinks.sortOrder), asc(schema.oaLinks.createdAt)],
  });

  const tagRows = await db
    .select({ name: schema.tags.name })
    .from(schema.oaSetTags)
    .innerJoin(schema.tags, eq(schema.oaSetTags.tagId, schema.tags.id))
    .where(eq(schema.oaSetTags.oaSetId, oa.id));

  // Attribution: never expose uploader unless they opted in via showAttribution.
  // We only resolve names for files where show_attribution = true.
  const attributedNames = new Map<string, string>();
  const attributedIds = Array.from(
    new Set(files.filter((f) => f.showAttribution && f.uploadedBy).map((f) => f.uploadedBy!))
  );
  if (attributedIds.length) {
    const rows = await db.query.users.findMany({
      where: (t, { inArray }) => inArray(t.id, attributedIds),
    });
    for (const r of rows) attributedNames.set(r.id, r.name ?? r.email.split("@")[0]);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={company ? `/companies/${company.slug}` : "/companies"}>
            <ChevronLeft className="h-4 w-4" /> {company?.name ?? "Back"}
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">{oa.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {oa.college && <Badge variant="default">{oa.college}</Badge>}
          {oa.year && <Badge variant="outline">{oa.year}</Badge>}
          {oa.conductedForBatch && <Badge variant="outline">Batch {oa.conductedForBatch}</Badge>}
          {oa.durationMin && <Badge variant="outline">{oa.durationMin} min</Badge>}
          {oa.difficulty && (
            <Badge variant={oa.difficulty === "easy" ? "success" : oa.difficulty === "hard" ? "destructive" : "warning"}>
              {oa.difficulty}
            </Badge>
          )}
          {oa.ctc && <Badge variant="success">CTC: {oa.ctc}</Badge>}
          {tagRows.map((t) => (
            <Badge key={t.name} variant="secondary">
              {t.name}
            </Badge>
          ))}
        </div>
      </header>

      {oa.notes && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Questions / Notes</h2>
          <Card>
            <CardContent className="p-5 text-sm whitespace-pre-wrap leading-relaxed">{oa.notes}</CardContent>
          </Card>
        </section>
      )}

      {links.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Links</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {links.map((l) => {
              let host = "";
              try {
                host = new URL(l.url).hostname.replace(/^www\./, "");
              } catch {}
              return (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/50"
                >
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H18a2 2 0 012 2v4.5M18 13.5L10.5 21 3 13.5 10.5 6 18 13.5z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium group-hover:underline">
                      {l.label || host || l.url}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{host || l.url}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {files.length === 0 && links.length === 0 && !oa.notes ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No content attached yet.
          </CardContent>
        </Card>
      ) : files.length > 0 ? (
        <OaViewer
          files={files.map((f) => ({
            id: f.id,
            kind: f.kind,
            displayName: f.displayName,
            attribution:
              f.showAttribution && f.uploadedBy
                ? attributedNames.get(f.uploadedBy) ?? "An NIT Srinagar student"
                : "An NIT Srinagar student",
            isOwnUpload: f.uploadedBy === session.user.id,
          }))}
          viewerEmail={session.user.email ?? ""}
        />
      ) : null}
    </div>
  );
}
