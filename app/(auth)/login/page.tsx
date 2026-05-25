import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, desc, eq, sql } from "drizzle-orm";
import { auth, signIn } from "@/lib/auth";
import { db, schema } from "@/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompanyAvatar } from "@/components/company-avatar";
import { CompanyLogo } from "@/components/company-logo";
import { LoginErrorModal } from "./login-error-modal";
import { AnimatedCounter } from "./animated-counter";
import {
  ArrowRight,
  BookOpen,
  Eye,
  FileText,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  domain: {
    title: "Please use your official NIT Srinagar email",
    body: "This platform is restricted to current NIT Srinagar students. Sign in with your @nitsri.ac.in Google account to continue.",
  },
  blocked: {
    title: "Account blocked",
    body: "Your account has been blocked by an administrator. Reach out if you think this is a mistake.",
  },
  default: {
    title: "Sign-in failed",
    body: "Something went wrong while signing you in. Please try again.",
  },
};

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (session?.user) redirect(sp.from || "/");

  const err = sp.error ? (ERROR_COPY[sp.error] ?? ERROR_COPY.default) : null;
  const redirectTo = sp.from || "/";

  const [
    companiesR,
    oaSetsR,
    interviewsR,
    placementsR,
    usersR,
    marqueeR,
    recentOasR,
    contributorsR,
  ] = await Promise.all([
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
    db.select({ n: sql<number>`count(*)` }).from(schema.users),
    db
      .select({
        name: schema.companies.name,
        oaCount: sql<number>`count(${schema.oaSets.id})`,
      })
      .from(schema.companies)
      .leftJoin(schema.oaSets, eq(schema.oaSets.companyId, schema.companies.id))
      .groupBy(schema.companies.id)
      .orderBy(sql`count(${schema.oaSets.id}) desc`)
      .limit(24),
    db
      .select({
        id: schema.oaSets.id,
        title: schema.oaSets.title,
        year: schema.oaSets.year,
        college: schema.oaSets.college,
        companyName: schema.companies.name,
      })
      .from(schema.oaSets)
      .innerJoin(schema.companies, eq(schema.oaSets.companyId, schema.companies.id))
      .orderBy(desc(schema.oaSets.createdAt))
      .limit(4),
    db.select({ name: schema.users.name, email: schema.users.email }).from(schema.users).orderBy(asc(schema.users.createdAt)).limit(8),
  ]);

  const companyCount = companiesR[0]?.n ?? 0;
  const oaCount = oaSetsR[0]?.n ?? 0;
  const interviewCount = interviewsR[0]?.n ?? 0;
  const placementCount = placementsR[0]?.n ?? 0;
  const userCount = usersR[0]?.n ?? 0;
  const marqueeCompanies = marqueeR.filter((c) => c.oaCount > 0);
  // For seamless loop, duplicate
  const marqueeLoop = [...marqueeCompanies, ...marqueeCompanies];

  async function signInAction() {
    "use server";
    await signIn("google", { redirectTo });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <BackgroundFx />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/login" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-primary-foreground font-bold shadow-lg shadow-primary/20">
              C
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold">CampusVault</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                NIT Srinagar
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <a href="#features" className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline">
              Features
            </a>
            <a href="#how" className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline">
              How it works
            </a>
            <a href="#privacy" className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline">
              Privacy
            </a>
            <form action={signInAction}>
              <Button size="sm" className="rounded-full">
                Sign in <ArrowRight className="h-3 w-3" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container relative z-10 pt-16 pb-12 sm:pt-24 sm:pb-16 lg:pt-32 lg:pb-24">
        <div className="mx-auto max-w-4xl text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary shadow-lg shadow-primary/10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Live · Private NIT Srinagar platform
          </div>

          <h1 className="mt-6 text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl lg:text-8xl">
            <span className="block">Crack placements</span>
            <span className="mt-2 block bg-gradient-to-r from-primary via-blue-400 to-emerald-400 bg-clip-text pb-2 text-transparent">
              with what your seniors knew.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            A private archive of <span className="font-semibold text-foreground">{oaCount}+ Online Assessments</span>,
            interview experiences, and real placement data — shared by your seniors and batchmates.
            <span className="block mt-2">No paywall. No spam. No leaks.</span>
          </p>

          <form
            action={signInAction}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-full px-8 text-base shadow-xl shadow-primary/20 sm:w-auto"
            >
              <GoogleIcon /> Continue with Google
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-full px-8 text-base sm:w-auto"
              asChild
            >
              <a href="#features">See what&apos;s inside</a>
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-3">
            <AvatarStack people={contributorsR} />
            <p className="text-xs text-muted-foreground">
              Joined by <span className="font-semibold text-foreground">{userCount}</span> NIT Srinagar
              {userCount === 1 ? " student" : " students"}
            </p>
          </div>
        </div>

        {/* Stats panel */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="rounded-2xl border bg-card/40 p-1 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border lg:grid-cols-4">
              <StatBlock label="Companies" value={companyCount} accent="text-blue-400" />
              <StatBlock label="OA archives" value={oaCount} accent="text-violet-400" />
              <StatBlock label="Interview notes" value={interviewCount} accent="text-amber-400" />
              <StatBlock label="Placement records" value={placementCount} accent="text-emerald-400" />
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      {marqueeLoop.length > 0 && (
        <section className="relative z-10 py-8 sm:py-12">
          <p className="container mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Recent contributions from
          </p>
          <div className="mask-fade-x overflow-hidden">
            <div className="flex w-max animate-marquee gap-3 px-3">
              {marqueeLoop.map((c, i) => (
                <div
                  key={`${c.name}-${i}`}
                  className="flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1.5 backdrop-blur"
                >
                  <CompanyLogo name={c.name} size="xs" />
                  <span className="text-xs font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features (bento) */}
      <section id="features" className="container relative z-10 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-3">
            What you&apos;ll get
          </Badge>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Everything for OA &amp; interview prep, in one place
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Four pillars, growing as your batch contributes back.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-4 md:grid-cols-3">
          {/* OA archive — wide */}
          <FeatureTile
            className="md:col-span-2"
            gradient="from-violet-500/20 via-violet-500/5 to-transparent"
            iconClass="bg-violet-500/15 text-violet-400"
            icon={<BookOpen className="h-5 w-5" />}
            title="Past OA archive"
            body="Company-wise PDFs, ZIPs, images, and write-ups of Online Assessments — from NIT Srinagar and 30+ partner colleges."
            footer={
              recentOasR.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-2">
                  {recentOasR.slice(0, 4).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center gap-2 rounded-lg border bg-background/40 p-2"
                    >
                      <CompanyLogo name={o.companyName} size="xs" />
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-medium">{o.companyName}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {o.year ?? "—"} {o.college ? `· ${o.college}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          />

          {/* Watermarked - tall */}
          <FeatureTile
            className="md:row-span-2"
            gradient="from-rose-500/15 via-rose-500/5 to-transparent"
            iconClass="bg-rose-500/15 text-rose-400"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Watermarked & audited"
            body="Every page you open carries your email diagonally as a watermark. Every view is logged in an audit trail."
            footer={
              <div className="mt-6 overflow-hidden rounded-xl border bg-black/40 p-4">
                <div className="relative">
                  <div className="space-y-1.5 text-[10px] text-muted-foreground/70">
                    <div className="h-1.5 w-4/5 rounded bg-muted-foreground/20" />
                    <div className="h-1.5 w-3/5 rounded bg-muted-foreground/20" />
                    <div className="h-1.5 w-5/6 rounded bg-muted-foreground/20" />
                    <div className="h-1.5 w-2/5 rounded bg-muted-foreground/20" />
                    <div className="h-1.5 w-4/6 rounded bg-muted-foreground/20" />
                  </div>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -rotate-12 select-none text-[9px] font-mono text-rose-400/40"
                    style={{ lineHeight: "1.2" }}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i}>you@nitsri.ac.in · you@nitsri.ac.in</div>
                    ))}
                  </div>
                </div>
              </div>
            }
          />

          <FeatureTile
            gradient="from-amber-500/20 via-amber-500/5 to-transparent"
            iconClass="bg-amber-500/15 text-amber-400"
            icon={<Video className="h-5 w-5" />}
            title="Interview videos"
            body="Curated YouTube walkthroughs of full interview loops — embedded right inside the platform."
          />

          <FeatureTile
            gradient="from-emerald-500/20 via-emerald-500/5 to-transparent"
            iconClass="bg-emerald-500/15 text-emerald-400"
            icon={<TrendingUp className="h-5 w-5" />}
            title="Placement data"
            body="CTC, role, CGPA cutoffs, MTech eligibility — real, recent stats from confirmed offers."
          />

          <FeatureTile
            gradient="from-cyan-500/20 via-cyan-500/5 to-transparent"
            iconClass="bg-cyan-500/15 text-cyan-400"
            icon={<FileText className="h-5 w-5" />}
            title="Interview blogs"
            body="Written experiences from seniors. Always attributed — you know exactly who's speaking."
          />

          <FeatureTile
            className="md:col-span-2"
            gradient="from-blue-500/20 via-blue-500/5 to-transparent"
            iconClass="bg-blue-500/15 text-blue-400"
            icon={<Users className="h-5 w-5" />}
            title="Community-driven"
            body="Any signed-in student can contribute. Files stream through a secure proxy. Uploaders stay anonymous by default — opt in if you want the credit."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container relative z-10 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-3">
            How it works
          </Badge>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Three steps. No hoops.
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
          <StepCard
            n="01"
            title="Sign in with college Google"
            body="No password to remember. No public signup. The platform checks your @nitsri.ac.in domain server-side, every time."
            icon={<Lock className="h-4 w-4" />}
          />
          <StepCard
            n="02"
            title="Browse contributions"
            body="Filter by company, college, year, or tag. Open a PDF or watch a video — it streams in a watermarked, copy-resistant viewer."
            icon={<Sparkles className="h-4 w-4" />}
          />
          <StepCard
            n="03"
            title="Give back to juniors"
            body="Upload your own OA, write an interview blog, or add placement data. Your name stays hidden unless you opt in."
            icon={<ArrowRight className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="container relative z-10 py-16 sm:py-24">
        <Card className="mx-auto max-w-5xl overflow-hidden border-primary/20 bg-gradient-to-br from-card/80 via-card/40 to-emerald-500/10 backdrop-blur">
          <CardContent className="grid gap-8 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <Badge className="mb-4">Privacy first</Badge>
              <h2 className="text-balance text-2xl font-bold sm:text-4xl">
                A private island, not a public forum.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
                This isn&apos;t a marketplace or a blog network. It&apos;s an internal student
                platform built on the same trust your seniors had when they passed notes by hand.
              </p>
            </div>
            <ul className="space-y-3">
              <PromiseLine
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Domain-locked"
                body="Only @nitsri.ac.in Google accounts, server-side verified."
              />
              <PromiseLine
                icon={<Eye className="h-4 w-4" />}
                title="No public indexing"
                body="noindex + robots.txt + auth wall. Search engines never see content."
              />
              <PromiseLine
                icon={<Lock className="h-4 w-4" />}
                title="Drive URLs never leak"
                body="Files proxy through 60-second single-use tokens — no Drive link ever reaches your browser."
              />
              <PromiseLine
                icon={<Users className="h-4 w-4" />}
                title="Anonymous by default"
                body="Uploader identity hidden in the UI. Opt in per upload if you want the credit."
              />
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Live stats reprise */}
      <section className="container relative z-10 py-12">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Growing every week
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center">
          <BigCount value={oaCount} label="OAs archived" />
          <BigCount value={companyCount} label="companies" />
          <BigCount value={interviewCount + placementCount} label="experiences" />
          <BigCount value={userCount} label="students" />
        </div>
      </section>

      {/* Final CTA */}
      <section className="container relative z-10 py-16 sm:py-28">
        <div className="mx-auto max-w-3xl rounded-3xl border bg-gradient-to-br from-primary/20 via-card to-card p-10 text-center backdrop-blur sm:p-16">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Your senior already aced this OA.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Sign in with your NIT Srinagar email and unlock the archive in under five seconds.
          </p>
          <form action={signInAction} className="mt-8 flex justify-center">
            <Button
              type="submit"
              size="lg"
              className="h-12 rounded-full px-8 text-base shadow-xl shadow-primary/30"
            >
              <GoogleIcon /> Continue with Google <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Only emails ending in <span className="font-mono text-foreground">@nitsri.ac.in</span> can sign in.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/30">
        <div className="container flex flex-col gap-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Built for NIT Srinagar students. Not affiliated with the institute administration.
          </div>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span className="text-muted-foreground/60">
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>

      {err && <LoginErrorModal title={err.title} body={err.body} />}
    </div>
  );
}

function BackgroundFx() {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 10%, #000 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 10%, #000 30%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[700px] bg-gradient-to-b from-primary/10 via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="absolute right-[-10%] top-[-5%] -z-10 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="absolute left-[-10%] top-[20%] -z-10 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="absolute right-[10%] top-[60%] -z-10 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[120px]"
      />
    </>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-card/90 p-5 text-center backdrop-blur sm:p-7">
      <div className={`text-4xl font-bold tabular-nums sm:text-5xl ${accent}`}>
        <AnimatedCounter value={value} />
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function FeatureTile({
  className,
  gradient,
  iconClass,
  icon,
  title,
  body,
  footer,
}: {
  className?: string;
  gradient: string;
  iconClass: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-card/60 p-6 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-2xl hover:shadow-black/30 sm:p-8 ${className ?? ""}`}
    >
      <div
        aria-hidden
        className={`absolute inset-0 -z-10 bg-gradient-to-br opacity-80 transition-opacity group-hover:opacity-100 ${gradient}`}
      />
      <div
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconClass} transition-transform group-hover:scale-110`}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-bold sm:text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      {footer}
    </div>
  );
}

function StepCard({
  n,
  title,
  body,
  icon,
}: {
  n: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative rounded-2xl border bg-card/60 p-6 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs font-bold tracking-wider text-primary">{n}</div>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function PromiseLine({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{body}</div>
      </div>
    </li>
  );
}

function AvatarStack({ people }: { people: { name: string | null; email: string }[] }) {
  return (
    <div className="flex -space-x-2">
      {people.slice(0, 5).map((p, i) => {
        const label = p.name ?? p.email.split("@")[0];
        return (
          <div
            key={i}
            className="ring-2 ring-background"
            style={{ zIndex: people.length - i }}
          >
            <CompanyAvatar name={label} size="xs" className="border-0" />
          </div>
        );
      })}
    </div>
  );
}

function BigCount({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold tabular-nums sm:text-4xl">
        <AnimatedCounter value={value} />
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.1C29.2 35.2 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.1C41.9 35.7 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
