"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, ChevronDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PlacementCardData {
  kind: "placement" | "oa";
  id: string;
  companyName: string;
  role: string;
  college: string;
  entryType: "entry" | "intern" | "fte" | "ppo" | "oa";
  oaDate: string | null;
  ctc: string | null;
  cgpaCriteria: string | null;
  mtechEligible: boolean | null;
  notes: string | null;
  createdAt: string | Date;
  linkHref: string | null;
}

const TYPE_LABEL: Record<PlacementCardData["entryType"], string> = {
  entry: "Entry",
  intern: "Intern",
  fte: "FTE",
  ppo: "PPO",
  oa: "OA",
};

function formatStamp(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function PlacementCard({ entry }: { entry: PlacementCardData }) {
  const [expanded, setExpanded] = useState(false);

  const stats: { label: string; value: string | null }[] = [
    { label: entry.kind === "oa" ? "When" : "OA Date", value: entry.oaDate },
    { label: "CTC", value: entry.ctc },
    { label: "CGPA Criteria", value: entry.cgpaCriteria },
    {
      label: "MTech Eligible",
      value: entry.mtechEligible === null ? null : entry.mtechEligible ? "Yes" : "No",
    },
  ];

  const body = (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-5 rounded-xl border border-border/60 bg-card/60 p-5",
        "transition-all hover:border-border hover:bg-card/80 hover:shadow-lg hover:shadow-black/20"
      )}
    >
      <header className="flex items-start justify-between">
        <Badge
          variant="secondary"
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            entry.kind === "oa" ? "bg-primary/20 text-primary" : "bg-muted/60"
          )}
        >
          {TYPE_LABEL[entry.entryType]}
        </Badge>
        <time className="font-mono text-xs text-muted-foreground">{formatStamp(entry.createdAt)}</time>
      </header>

      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-2xl font-semibold leading-tight">
          {entry.companyName}
          {entry.kind === "oa" && (
            <ExternalLink className="h-4 w-4 text-muted-foreground transition-opacity opacity-0 group-hover:opacity-100" />
          )}
        </h3>
        <p className="text-sm text-foreground/80">{entry.role}</p>
        <p className="text-xs text-muted-foreground">{entry.college}</p>
      </div>

      <ul className="space-y-3">
        {stats.map((s) => (
          <li key={s.label} className="flex items-start gap-3">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <div className="leading-tight">
              <div className="text-[13px] font-medium">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.value || "—"}</div>
            </div>
          </li>
        ))}
      </ul>

      {entry.notes && (
        <>
          {expanded ? (
            <div className="rounded-md border bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {entry.notes}
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="self-stretch rounded-full bg-foreground text-background hover:bg-foreground/90"
              onClick={(e) => {
                e.preventDefault();
                setExpanded(true);
              }}
            >
              View Details <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </article>
  );

  if (entry.linkHref) {
    return (
      <Link href={entry.linkHref} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
