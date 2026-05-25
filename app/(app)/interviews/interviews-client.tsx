"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { youtubeThumbnail } from "@/lib/youtube";
import { AddVideoDialog } from "./add-video-dialog";
import { WriteBlogDialog } from "./write-blog-dialog";

export interface InterviewListItem {
  id: string;
  kind: "video" | "blog";
  companyName: string;
  role: string | null;
  college: string | null;
  year: number | null;
  youtubeVideoId: string | null;
  title: string | null;
  contentSnippet: string;
  authorName: string;
  createdAt: string;
}

interface Props {
  companies: { id: string; name: string }[];
  isAdmin: boolean;
  currentUserName: string | null;
}

export function InterviewsClient({ companies, isAdmin, currentUserName }: Props) {
  const [entries, setEntries] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "video" | "blog">("all");
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [writeBlogOpen, setWriteBlogOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/interviews?limit=200");
      const j = await res.json();
      setEntries(j.entries ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (tab !== "all" && e.kind !== tab) return false;
      if (!q) return true;
      return (
        e.companyName.toLowerCase().includes(q) ||
        (e.title ?? "").toLowerCase().includes(q) ||
        (e.role ?? "").toLowerCase().includes(q) ||
        e.authorName.toLowerCase().includes(q)
      );
    });
  }, [entries, query, tab]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Interview experiences</h1>
        <p className="text-sm text-muted-foreground">
          Recorded interview walkthroughs and written notes from your seniors and batchmates.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setWriteBlogOpen(true)}>
            <FileText className="h-4 w-4" /> Write blog
          </Button>
          {isAdmin && (
            <Button variant="secondary" onClick={() => setAddVideoOpen(true)}>
              <Plus className="h-4 w-4" /> Add YouTube video (admin)
            </Button>
          )}
        </div>
      </header>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by company, role, author…"
          className="pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
          <TabsTrigger value="video">
            Videos ({entries.filter((e) => e.kind === "video").length})
          </TabsTrigger>
          <TabsTrigger value="blog">
            Blogs ({entries.filter((e) => e.kind === "blog").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <EmptyState
              onWriteBlog={() => setWriteBlogOpen(true)}
              onAddVideo={isAdmin ? () => setAddVideoOpen(true) : undefined}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((e) => (e.kind === "video" ? <VideoCard key={e.id} e={e} /> : <BlogCard key={e.id} e={e} />))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddVideoDialog
        open={addVideoOpen}
        onOpenChange={setAddVideoOpen}
        companies={companies}
        onCreated={() => {
          setAddVideoOpen(false);
          load();
        }}
      />
      <WriteBlogDialog
        open={writeBlogOpen}
        onOpenChange={setWriteBlogOpen}
        companies={companies}
        authorName={currentUserName}
        onCreated={() => {
          setWriteBlogOpen(false);
          load();
        }}
      />
    </div>
  );
}

function VideoCard({ e }: { e: InterviewListItem }) {
  const thumb = e.youtubeVideoId ? youtubeThumbnail(e.youtubeVideoId) : null;
  return (
    <Link href={`/interviews/${e.id}`}>
      <Card className="h-full overflow-hidden transition-colors hover:border-primary/50">
        {thumb && (
          <div className="relative aspect-video bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-black">
                <Video className="h-5 w-5" />
              </div>
            </div>
            <Badge className="absolute left-2 top-2 bg-red-600 text-white">Video</Badge>
          </div>
        )}
        <CardContent className="space-y-1 p-4">
          <div className="text-xs text-muted-foreground">{e.companyName}</div>
          <div className="font-medium leading-tight">{e.role ?? "Interview"}</div>
          <div className="text-xs text-muted-foreground">
            {e.college ?? "—"}
            {e.year ? ` · ${e.year}` : ""}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function BlogCard({ e }: { e: InterviewListItem }) {
  return (
    <Link href={`/interviews/${e.id}`}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <Badge variant="default">Blog</Badge>
            <span className="text-xs text-muted-foreground">{e.companyName}</span>
          </div>
          <h3 className="text-base font-semibold leading-tight">{e.title}</h3>
          <p className="line-clamp-3 text-sm text-muted-foreground">{e.contentSnippet}</p>
          <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
            <span>by <span className="font-medium text-foreground">{e.authorName}</span></span>
            {e.role && <span>{e.role}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl border bg-card" />
      ))}
    </div>
  );
}

function EmptyState({ onWriteBlog, onAddVideo }: { onWriteBlog: () => void; onAddVideo?: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-12 text-center text-sm text-muted-foreground">
        <div>No interview experiences yet.</div>
        <div className="flex justify-center gap-2">
          <Button onClick={onWriteBlog}>Write the first blog</Button>
          {onAddVideo && (
            <Button variant="secondary" onClick={onAddVideo}>
              Add the first video
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
