import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { youtubeEmbedSrc } from "@/lib/youtube";
import { InterviewActions } from "./actions";

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const entry = await db.query.interviewExperiences.findFirst({
    where: eq(schema.interviewExperiences.id, id),
  });
  if (!entry || entry.status !== "approved") notFound();

  const company = await db.query.companies.findFirst({
    where: eq(schema.companies.id, entry.companyId),
  });

  const isAdmin = session.user.role === "admin";
  const isAuthor = entry.authorId === session.user.id;
  const canEdit = entry.kind === "video" ? isAdmin : isAdmin || isAuthor;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/interviews">
          <ChevronLeft className="h-4 w-4" /> Interview experiences
        </Link>
      </Button>

      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={entry.kind === "video" ? "destructive" : "default"}>
            {entry.kind === "video" ? "Video" : "Blog"}
          </Badge>
          <span className="text-sm text-muted-foreground">{company?.name ?? "Company"}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {entry.title ?? entry.role ?? `${company?.name ?? "Interview"} experience`}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            by <span className="font-medium text-foreground">{entry.authorName}</span>
          </span>
          {entry.role && <span>· {entry.role}</span>}
          {entry.college && <span>· {entry.college}</span>}
          {entry.year && <span>· {entry.year}</span>}
        </div>
      </header>

      {entry.kind === "video" && entry.youtubeVideoId ? (
        <div className="overflow-hidden rounded-xl border bg-black">
          <div className="relative aspect-video">
            <iframe
              src={youtubeEmbedSrc(entry.youtubeVideoId)}
              title={entry.title ?? "Interview video"}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      ) : entry.kind === "blog" && entry.content ? (
        <Card>
          <CardContent className="prose prose-invert max-w-none whitespace-pre-wrap p-6 text-sm leading-relaxed">
            {entry.content}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No content.</CardContent>
        </Card>
      )}

      {canEdit && (
        <InterviewActions
          id={entry.id}
          isAdmin={isAdmin}
          isAuthor={isAuthor}
          kind={entry.kind}
        />
      )}
    </div>
  );
}
