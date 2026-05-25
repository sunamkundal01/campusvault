import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Link2,
  Sparkles,
} from "lucide-react";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await db.query.companies.findFirst({
    where: eq(schema.companies.slug, slug),
  });
  if (!company) notFound();

  const sets = await db
    .select({
      id: schema.oaSets.id,
      title: schema.oaSets.title,
      college: schema.oaSets.college,
      year: schema.oaSets.year,
      conductedForBatch: schema.oaSets.conductedForBatch,
      difficulty: schema.oaSets.difficulty,
      durationMin: schema.oaSets.durationMin,
      ctc: schema.oaSets.ctc,
      notes: schema.oaSets.notes,
      createdAt: schema.oaSets.createdAt,
      fileCount: sql<number>`(SELECT COUNT(*) FROM files WHERE files.oa_set_id = ${schema.oaSets.id} AND files.status = 'approved')`,
      linkCount: sql<number>`(SELECT COUNT(*) FROM oa_links WHERE oa_links.oa_set_id = ${schema.oaSets.id} AND oa_links.status = 'approved')`,
    })
    .from(schema.oaSets)
    .where(eq(schema.oaSets.companyId, company.id))
    .orderBy(desc(schema.oaSets.year), desc(schema.oaSets.createdAt));

  const years = new Set(sets.map((s) => s.year).filter((v): v is number => !!v));
  const colleges = new Set(sets.map((s) => s.college).filter((v): v is string => !!v));
  const totalFiles = sets.reduce((acc, x) => acc + Number(x.fileCount || 0), 0);
  const totalLinks = sets.reduce((acc, x) => acc + Number(x.linkCount || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <Button variant="outline" size="sm" asChild>
        <Link href="/companies">
          <ChevronLeft className="h-4 w-4" /> All companies
        </Link>
      </Button>

      {/* Company hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8">
        <div
          aria-hidden
          className="absolute right-[-10%] top-[-40%] -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <CompanyLogo name={company.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{company.name}</h1>
            {company.hiringRole && (
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {company.hiringRole}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <HeroStat icon={<Sparkles className="h-4 w-4" />} value={sets.length} label={sets.length === 1 ? "OA set" : "OA sets"} />
              <HeroStat icon={<Calendar className="h-4 w-4" />} value={years.size} label={years.size === 1 ? "year" : "years"} />
              <HeroStat icon={<GraduationCap className="h-4 w-4" />} value={colleges.size} label={colleges.size === 1 ? "college" : "colleges"} />
              {totalFiles > 0 && (
                <HeroStat icon={<FileText className="h-4 w-4" />} value={totalFiles} label={totalFiles === 1 ? "file" : "files"} />
              )}
              {totalLinks > 0 && (
                <HeroStat icon={<Link2 className="h-4 w-4" />} value={totalLinks} label={totalLinks === 1 ? "link" : "links"} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* OA sets */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Online Assessments
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Click any card to open the full archive.
            </p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/contribute">
              Contribute one <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {sets.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 p-12 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">
                  No OAs yet for {company.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Be the first to share what you took.
                </p>
              </div>
              <Button asChild>
                <Link href="/contribute">
                  Contribute the first OA <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {sets.map((s) => (
              <OaCard key={s.id} oa={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
        {icon}
      </span>
      <span className="text-base font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

interface OaRow {
  id: string;
  title: string;
  college: string | null;
  year: number | null;
  conductedForBatch: number | null;
  difficulty: "easy" | "medium" | "hard" | null;
  durationMin: number | null;
  ctc: string | null;
  notes: string | null;
  fileCount: number;
  linkCount: number;
}

function OaCard({ oa }: { oa: OaRow }) {
  const fc = Number(oa.fileCount || 0);
  const lc = Number(oa.linkCount || 0);
  const hasContent = fc > 0 || lc > 0 || (oa.notes && oa.notes.trim().length > 0);

  return (
    <Link href={`/oa/${oa.id}`} className="group block focus:outline-none">
      <Card className="h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card/90 hover:shadow-xl hover:shadow-black/20 group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-base font-semibold leading-snug">
                {oa.title}
              </h3>
              {oa.college && (
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {oa.college}
                </p>
              )}
            </div>
            {oa.difficulty && (
              <Badge
                variant={
                  oa.difficulty === "easy"
                    ? "success"
                    : oa.difficulty === "hard"
                      ? "destructive"
                      : "warning"
                }
              >
                {oa.difficulty}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {oa.year && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Calendar className="h-3 w-3" /> {oa.year}
              </Badge>
            )}
            {oa.durationMin && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Clock className="h-3 w-3" /> {oa.durationMin} min
              </Badge>
            )}
            {fc > 0 && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <FileText className="h-3 w-3" /> {fc} {fc === 1 ? "file" : "files"}
              </Badge>
            )}
            {lc > 0 && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Link2 className="h-3 w-3" /> {lc} {lc === 1 ? "link" : "links"}
              </Badge>
            )}
            {oa.ctc && (
              <Badge variant="success" className="text-[10px]">
                CTC: {oa.ctc}
              </Badge>
            )}
          </div>

          {oa.notes && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{oa.notes}</p>
          )}

          <div className="mt-auto flex items-center justify-between border-t pt-3">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {hasContent ? "Tap to open" : "Empty record"}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-all group-hover:gap-2">
              View
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
