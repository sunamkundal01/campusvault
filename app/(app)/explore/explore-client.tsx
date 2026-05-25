"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlacementCard, type PlacementCardData } from "./placement-card";
import { AddPlacementDialog } from "./add-placement-dialog";

interface Props {
  companies: { id: string; name: string }[];
}

export function ExploreClient({ companies }: Props) {
  const [entries, setEntries] = useState<PlacementCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/placements?limit=200");
      const j = await res.json();
      setEntries(j.entries ?? []);
      setTotal(j.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.companyName.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.college.toLowerCase().includes(q)
    );
  }, [entries, query]);

  return (
    <div className="space-y-10">
      <header className="space-y-4 text-center">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">Placement Data</h1>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Salaries, CTC &amp; hiring stats by company
          </p>
        </div>
        <p className="text-base text-muted-foreground">
          Real-time placement insights from top colleges across India.
        </p>

        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            className="rounded-full bg-foreground px-6 text-background hover:bg-foreground/90"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" /> Add Company Info
          </Button>
        </div>
      </header>

      <section className="mx-auto flex max-w-2xl items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies, roles, colleges…"
            className="h-12 rounded-full border-border/60 bg-card/60 pl-11 text-base"
          />
        </div>
        <Button
          size="lg"
          className="rounded-full bg-foreground px-6 text-background hover:bg-foreground/90"
          onClick={() => {}}
        >
          Search
        </Button>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Showing {filtered.length} of {total} entries · placement entries + OA contributions
      </p>

      <section>
        {loading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
            No placement data yet. Be the first to{" "}
            <button onClick={() => setAddOpen(true)} className="text-primary underline">
              add an entry
            </button>
            .
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <PlacementCard key={e.id} entry={e} />
            ))}
          </div>
        )}
      </section>

      <AddPlacementDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        companies={companies}
        onCreated={() => {
          setAddOpen(false);
          load();
        }}
      />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-xl border bg-card" />
      ))}
    </div>
  );
}
