"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLLEGE_GROUPS } from "@/lib/colleges";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companies: { id: string; name: string }[];
  authorName: string | null;
  onCreated: () => void;
}

export function WriteBlogDialog({ open, onOpenChange, companies, authorName, onCreated }: Props) {
  const [companyMode, setCompanyMode] = useState<"existing" | "new">(
    companies.length === 0 ? "new" : "existing"
  );
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id ?? "");
  const [newCompany, setNewCompany] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [role, setRole] = useState("");
  const [college, setCollege] = useState("");
  const [year, setYear] = useState<number | "">(new Date().getFullYear());
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) return toast.error("Title is too short.");
    if (content.trim().length < 20) return toast.error("Blog needs at least 20 characters.");
    if (companyMode === "existing" && !companyId) return toast.error("Pick a company.");
    if (companyMode === "new" && !newCompany.trim()) return toast.error("Enter a company.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/interviews/blog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyId: companyMode === "existing" ? companyId : undefined,
          newCompanyName: companyMode === "new" ? newCompany.trim() : undefined,
          title: title.trim(),
          content: content.trim(),
          role: role || undefined,
          college: college || undefined,
          year: year || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "create_failed");
      }
      toast.success("Blog published.");
      setTitle("");
      setContent("");
      setRole("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Write an interview blog</DialogTitle>
          <DialogDescription>
            Your post will appear publicly under your name <span className="font-medium">{authorName ?? "(your Google account name)"}</span>.
            Attribution is required for blog posts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>Company</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={companyMode === "existing" ? "default" : "outline"}
                onClick={() => setCompanyMode("existing")}
                disabled={companies.length === 0}
              >
                Pick existing
              </Button>
              <Button
                type="button"
                size="sm"
                variant={companyMode === "new" ? "default" : "outline"}
                onClick={() => setCompanyMode("new")}
              >
                Add new
              </Button>
            </div>
            {companyMode === "existing" ? (
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="e.g. Goldman Sachs" />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Blog title</Label>
            <Input
              id="title"
              placeholder='e.g. "My Amazon SDE interview — 5 rounds, what to prep"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="SDE I" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              <select
                id="college"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
              >
                <option value="">—</option>
                {COLLEGE_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.items.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Your experience</Label>
            <textarea
              id="content"
              rows={14}
              className="w-full rounded-md border bg-background p-3 font-mono text-sm leading-relaxed"
              placeholder={`Walk through your interview rounds, prep timeline, what worked, what didn't.\n\nLine breaks are preserved. Markdown isn't rendered yet — keep it plain.`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={40000}
            />
            <div className="text-right text-xs text-muted-foreground">{content.length}/40000</div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Publishing…" : "Publish blog"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
