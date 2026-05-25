import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Compass,
  MessageSquare,
  Sparkles,
  Upload,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/company-logo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("_")[0] ??
    "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const [
    recentOasR,
    companyCountR,
    oaCountR,
    interviewCountR,
    placementCountR,
    topCompaniesR,
  ] = await Promise.all([
    db
      .select({
        id: schema.oaSets.id,
        title: schema.oaSets.title,
        year: schema.oaSets.year,
        college: schema.oaSets.college,
        difficulty: schema.oaSets.difficulty,
        companyName: schema.companies.name,
        companySlug: schema.companies.slug,
      })
      .from(schema.oaSets)
      .innerJoin(schema.companies, eq(schema.oaSets.companyId, schema.companies.id))
      .orderBy(desc(schema.oaSets.createdAt))
      .limit(6),
    db.select({ n: sql<number>`count(*)` }).from(schema.companies),
    db.select({ n: sql<number>`count(*)` }).from(schema.oaSets),
    db
      .select({ n: sql<number>`count(*)` })
      .from(schema.interviewExperiences)
      .where(eq(schema.interviewExperiences.status, "approved")),
    db
      .select({ n: sql<number>`count(*)` })
      .from(schema.placementEntries)
      .where(eq(schema.placementEntries.status, "approved")),
    db
      .select({
        name: schema.companies.name,
        slug: schema.companies.slug,
        count: sql<number>`count(${schema.oaSets.id})`,
      })
      .from(schema.companies)
      .leftJoin(schema.oaSets, eq(schema.oaSets.companyId, schema.companies.id))
      .groupBy(schema.companies.id)
      .orderBy(sql`count(${schema.oaSets.id}) desc`)
      .limit(8),
  ]);

  const stats = [
    {
      label: "Companies",
      value: companyCountR[0]?.n ?? 0,
      icon: Building2,
      tint: "from-blue-500/20 to-blue-500/0 text-blue-400",
      href: "/companies",
    },
    {
      label: "OA archives",
      value: oaCountR[0]?.n ?? 0,
      icon: BookOpen,
      tint: "from-violet-500/20 to-violet-500/0 text-violet-400",
      href: "/explore",
    },
    {
      label: "Interviews",
      value: interviewCountR[0]?.n ?? 0,
      icon: MessageSquare,
      tint: "from-amber-500/20 to-amber-500/0 text-amber-400",
      href: "/interviews",
    },
    {
      label: "Placement data",
      value: placementCountR[0]?.n ?? 0,
      icon: Compass,
      tint: "from-emerald-500/20 to-emerald-500/0 text-emerald-400",
      href: "/explore",
    },
  ];

  const actions = [
    {
      href: "/explore",
      label: "Explore data",
      desc: "CTC, CGPA cutoffs, hiring stats",
      icon: Compass,
      accent: "bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25",
    },
    {
      href: "/interviews",
      label: "Interview prep",
      desc: "Videos & written blogs",
      icon: MessageSquare,
      accent: "bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25",
    },
    {
      href: "/contribute",
      label: "Contribute OA",
      desc: "Share with juniors",
      icon: Upload,
      accent: "bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25",
    },
    {
      href: "/companies",
      label: "Browse companies",
      desc: `${(companyCountR[0]?.n ?? 0).toLocaleString()} indexed`,
      icon: Building2,
      accent: "bg-violet-500/15 text-violet-400 group-hover:bg-violet-500/25",
    },
  ];

  const topCompanies = topCompaniesR.filter((c) => c.count > 0).slice(0, 8);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Greeting hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-card to-emerald-500/5 p-6 sm:p-10">
        <div className="absolute right-[-10%] top-[-30%] -z-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-30%] left-[20%] -z-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            Welcome back
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {greeting}, {firstName}.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Pick up where you left off, or explore what your seniors and batchmates have shared.
          </p>
        </div>
      </section>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card/60 p-5 backdrop-blur transition-all",
              "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/20"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 -z-10 bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-100",
                s.tint
              )}
            />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-1 text-3xl font-bold tabular-nums">
                  {s.value.toLocaleString()}
                </div>
              </div>
              <s.icon className={cn("h-5 w-5 opacity-70", s.tint.split(" ").pop())} />
            </div>
          </Link>
        ))}
      </section>

      {/* Quick actions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick actions
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-3 rounded-xl border bg-card/60 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/80"
            >
              <div
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors",
                  a.accent
                )}
              >
                <a.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{a.label}</div>
                <div className="truncate text-xs text-muted-foreground">{a.desc}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent + top companies side by side */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recently added
            </h2>
            <Link
              href="/explore"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentOasR.length === 0 ? (
            <Card>
              <CardContent className="space-y-3 p-10 text-center">
                <div className="text-sm text-muted-foreground">
                  Nothing here yet. Be the first to share what you took.
                </div>
                <Link
                  href="/contribute"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Contribute now <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentOasR.map((o) => (
                <Link key={o.id} href={`/oa/${o.id}`}>
                  <Card className="group h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/20">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start gap-3">
                        <CompanyLogo name={o.companyName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs text-muted-foreground">
                            {o.companyName}
                          </div>
                          <div className="line-clamp-2 text-sm font-semibold leading-tight">
                            {o.title}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {o.year && (
                          <Badge variant="outline" className="text-[10px]">
                            {o.year}
                          </Badge>
                        )}
                        {o.college && (
                          <Badge variant="secondary" className="max-w-[180px] truncate text-[10px]">
                            {o.college}
                          </Badge>
                        )}
                        {o.difficulty && (
                          <Badge
                            variant={
                              o.difficulty === "easy"
                                ? "success"
                                : o.difficulty === "hard"
                                  ? "destructive"
                                  : "warning"
                            }
                            className="text-[10px]"
                          >
                            {o.difficulty}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top companies
          </h2>
          {topCompanies.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No companies yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {topCompanies.map((c, i) => (
                    <li key={c.slug}>
                      <Link
                        href={`/companies/${c.slug}`}
                        className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/40"
                      >
                        <span className="w-5 text-center font-mono text-[10px] text-muted-foreground">
                          {i + 1}
                        </span>
                        <CompanyLogo name={c.name} size="sm" />
                        <div className="min-w-0 flex-1 truncate text-sm font-medium">
                          {c.name}
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {c.count}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
