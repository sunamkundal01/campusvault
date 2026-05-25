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
  onCreated: () => void;
}

export function AddVideoDialog({ open, onOpenChange, companies, onCreated }: Props) {
  const [companyMode, setCompanyMode] = useState<"existing" | "new">(
    companies.length === 0 ? "new" : "existing"
  );
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id ?? "");
  const [newCompany, setNewCompany] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [role, setRole] = useState("");
  const [college, setCollege] = useState("");
  const [year, setYear] = useState<number | "">(new Date().getFullYear());
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!youtubeUrl.trim()) return toast.error("Paste a YouTube URL.");
    if (companyMode === "existing" && !companyId) return toast.error("Pick a company.");
    if (companyMode === "new" && !newCompany.trim()) return toast.error("Enter a company.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/interviews/video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyId: companyMode === "existing" ? companyId : undefined,
          newCompanyName: companyMode === "new" ? newCompany.trim() : undefined,
          youtubeUrl: youtubeUrl.trim(),
          role: role || undefined,
          college: college || undefined,
          year: year || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "create_failed");
      }
      toast.success("Video added.");
      setYoutubeUrl("");
      setRole("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add interview video</DialogTitle>
          <DialogDescription>
            Paste a YouTube URL. The video will be embedded on the platform. Admin only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
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
            <Label htmlFor="yt">YouTube URL</Label>
            <Input
              id="yt"
              type="url"
              placeholder="https://youtu.be/… or https://www.youtube.com/watch?v=…"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                placeholder="Software Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="college">College (optional)</Label>
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add video"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
