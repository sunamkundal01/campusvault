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

export function AddPlacementDialog({ open, onOpenChange, companies, onCreated }: Props) {
  const [companyMode, setCompanyMode] = useState<"existing" | "new">(
    companies.length === 0 ? "new" : "existing"
  );
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id ?? "");
  const [newCompany, setNewCompany] = useState("");
  const [role, setRole] = useState("");
  const [college, setCollege] = useState("NIT Srinagar");
  const [entryType, setEntryType] = useState<"entry" | "intern" | "fte" | "ppo">("entry");
  const [oaDate, setOaDate] = useState("");
  const [ctc, setCtc] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [mtech, setMtech] = useState<"" | "yes" | "no">("");
  const [notes, setNotes] = useState("");
  const [showAttribution, setShowAttribution] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (companyMode === "existing" && !companyId) return toast.error("Pick a company.");
    if (companyMode === "new" && !newCompany.trim()) return toast.error("Enter a company name.");
    if (!role.trim()) return toast.error("Enter a role.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/placements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyId: companyMode === "existing" ? companyId : undefined,
          newCompanyName: companyMode === "new" ? newCompany.trim() : undefined,
          role: role.trim(),
          college,
          entryType,
          oaDate: oaDate || undefined,
          ctc: ctc || undefined,
          cgpaCriteria: cgpa || undefined,
          mtechEligible: mtech === "" ? null : mtech === "yes",
          notes: notes || undefined,
          showAttribution,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "create_failed");
      }
      toast.success("Added.");
      // reset minimal fields
      setRole("");
      setOaDate("");
      setCtc("");
      setCgpa("");
      setMtech("");
      setNotes("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add company info</DialogTitle>
          <DialogDescription>Share placement data with juniors and batchmates.</DialogDescription>
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
              <Input
                placeholder="e.g. Goldman Sachs"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as typeof entryType)}
              >
                <option value="entry">Entry</option>
                <option value="intern">Intern</option>
                <option value="fte">FTE</option>
                <option value="ppo">PPO</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="college">College</Label>
            <select
              id="college"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
            >
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="oaDate">OA Date</Label>
              <Input
                id="oaDate"
                placeholder="14/05/2026 at 10:00am"
                value={oaDate}
                onChange={(e) => setOaDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctc">CTC</Label>
              <Input
                id="ctc"
                placeholder="15 LPA · 31,97,000 · 1.5L/month CTC:45L"
                value={ctc}
                onChange={(e) => setCtc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cgpa">CGPA Criteria</Label>
              <Input
                id="cgpa"
                placeholder="7.0+"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mtech">MTech Eligible</Label>
              <select
                id="mtech"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={mtech}
                onChange={(e) => setMtech(e.target.value as typeof mtech)}
              >
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional details (shown under &ldquo;View Details&rdquo;)</Label>
            <textarea
              id="notes"
              rows={4}
              className="w-full rounded-md border bg-background p-2 text-sm"
              placeholder="Test format, interview rounds, anything else worth knowing…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={showAttribution}
              onChange={(e) => setShowAttribution(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Show my name as the contributor.{" "}
              <span className="text-muted-foreground">Off by default.</span>
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
