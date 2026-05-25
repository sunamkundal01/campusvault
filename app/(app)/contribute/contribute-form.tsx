"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBytes } from "@/lib/utils";
import { COLLEGE_GROUPS } from "@/lib/colleges";

const TOS_KEY = "pyqs.tos.v1";

interface Props {
  companies: { id: string; name: string; slug: string }[];
  tags: { id: string; name: string }[];
}

interface LinkRow {
  url: string;
  label: string;
}

export function ContributeForm({ companies, tags }: Props) {
  const router = useRouter();
  const [companyMode, setCompanyMode] = useState<"existing" | "new">(
    companies.length === 0 ? "new" : "existing"
  );
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id ?? "");
  const [newCompany, setNewCompany] = useState("");
  const [title, setTitle] = useState("");
  const [college, setCollege] = useState<string>("NIT Srinagar");
  const [year, setYear] = useState<number | "">(new Date().getFullYear());
  const [batch, setBatch] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "">("");
  const [ctc, setCtc] = useState("");
  const [contentText, setContentText] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([{ url: "", label: "" }]);
  const [pickedTags, setPickedTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [showAttribution, setShowAttribution] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tosOpen, setTosOpen] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  useEffect(() => {
    setTosAccepted(localStorage.getItem(TOS_KEY) === "1");
  }, []);

  function addLink() {
    setLinks((l) => [...l, { url: "", label: "" }]);
  }
  function removeLink(idx: number) {
    setLinks((l) => (l.length === 1 ? [{ url: "", label: "" }] : l.filter((_, i) => i !== idx)));
  }
  function updateLink(idx: number, patch: Partial<LinkRow>) {
    setLinks((l) => l.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function isValidUrl(s: string) {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tosAccepted) {
      setTosOpen(true);
      return;
    }

    const cleanedLinks = links
      .map((l) => ({ url: l.url.trim(), label: l.label.trim() }))
      .filter((l) => l.url.length > 0);

    const hasText = contentText.trim().length > 0;
    const hasLinks = cleanedLinks.length > 0;
    const hasFiles = files.length > 0;

    if (!hasText && !hasLinks && !hasFiles) {
      toast.error("Add written content, at least one link, or an attachment.");
      return;
    }
    for (const l of cleanedLinks) {
      if (!isValidUrl(l.url)) {
        toast.error(`Not a valid URL: ${l.url}`);
        return;
      }
    }
    if (companyMode === "new" && !newCompany.trim()) {
      toast.error("Enter a company name.");
      return;
    }
    if (companyMode === "existing" && !companyId) {
      toast.error("Pick a company.");
      return;
    }
    if (!title.trim()) {
      toast.error("Enter a title.");
      return;
    }

    setSubmitting(true);
    try {
      const createRes = await fetch("/api/oa-sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyId: companyMode === "existing" ? companyId : undefined,
          newCompanyName: companyMode === "new" ? newCompany.trim() : undefined,
          title: title.trim(),
          college: college.trim() || undefined,
          year: year || undefined,
          conductedForBatch: batch || undefined,
          durationMin: duration || undefined,
          difficulty: difficulty || undefined,
          ctc: ctc.trim() || undefined,
          notes: hasText ? contentText.trim() : undefined,
          tagIds: pickedTags,
          links: cleanedLinks,
          showAttribution,
        }),
      });
      if (!createRes.ok) {
        const j = await createRes.json().catch(() => ({}));
        throw new Error(j.error || "create_failed");
      }
      const { oaSetId } = (await createRes.json()) as { oaSetId: string };

      if (hasFiles) {
        const fd = new FormData();
        fd.set("oaSetId", oaSetId);
        fd.set("showAttribution", showAttribution ? "true" : "false");
        for (const f of files) fd.append("files", f);

        const upRes = await fetch("/api/uploads", { method: "POST", body: fd });
        if (!upRes.ok) {
          const j = await upRes.json().catch(() => ({}));
          throw new Error(j.error || "upload_failed");
        }
      }

      toast.success("Contribution saved.");
      router.push(`/oa/${oaSetId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="title">OA title</Label>
              <Input
                id="title"
                placeholder="e.g. SDE Intern OA — Round 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="college">College where this OA was conducted</Label>
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
              <p className="text-xs text-muted-foreground">
                Defaults to NIT Srinagar. Change it if you&apos;re sharing an OA you took at a different campus.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                <Label htmlFor="batch">Batch</Label>
                <Input
                  id="batch"
                  type="number"
                  placeholder="2022"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                >
                  <option value="">—</option>
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ctc">CTC <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
              <Input
                id="ctc"
                placeholder="e.g. 15 LPA · 31,97,000 · 1.5L/month CTC 45L"
                value={ctc}
                onChange={(e) => setCtc(e.target.value)}
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">
                Skip if you don&apos;t know. Mixed formats are fine.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const on = pickedTags.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setPickedTags((p) => (on ? p.filter((x) => x !== t.id) : [...p, t.id]))
                      }
                      className={
                        "rounded-full border px-3 py-1 text-xs transition-colors " +
                        (on ? "bg-primary text-primary-foreground" : "hover:bg-accent")
                      }
                    >
                      {t.name}
                    </button>
                  );
                })}
                {tags.length === 0 && (
                  <span className="text-xs text-muted-foreground">No tags yet (admin can add some).</span>
                )}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">
                Add <strong>any combination</strong> of the three below — written questions, external links, or file
                attachments.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Question text / notes</Label>
              <textarea
                id="content"
                rows={8}
                className="w-full rounded-md border bg-background p-3 font-mono text-sm"
                placeholder={`Write out the questions, exam format, anything you remember. Markdown is fine.\n\ne.g.\n\nQ1. Given an array of integers, find the longest subarray with sum ≤ K…\nQ2. SQL: Given the schema below, write a query to…`}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                maxLength={20000}
              />
              <div className="text-right text-xs text-muted-foreground">
                {contentText.length}/20000
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Links</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLink}>
                  <Plus className="h-3.5 w-3.5" /> Add link
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                LeetCode problems, blog write-ups, anything publicly hosted. Don&apos;t paste your own Drive links —
                use file upload below instead, so it&apos;s stored privately.
              </p>
              <div className="space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="https://leetcode.com/problems/..."
                      value={l.url}
                      onChange={(e) => updateLink(i, { url: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Label (optional)"
                      value={l.label}
                      onChange={(e) => updateLink(i, { label: e.target.value })}
                      className="w-40"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLink(i)}
                      aria-label="Remove link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Files</Label>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.zip,.docx"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                PDFs, images, ZIPs. Files are streamed through our proxy — viewers cannot download.
              </p>
              {files.length > 0 && (
                <ul className="text-xs text-muted-foreground">
                  {files.map((f) => (
                    <li key={f.name}>
                      {f.name} <span className="font-mono">{formatBytes(f.size)}</span>
                    </li>
                  ))}
                </ul>
              )}
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
                <span className="text-muted-foreground">
                  Off by default — viewers will see &ldquo;An NIT Srinagar student&rdquo;.
                </span>
              </span>
            </label>

            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? "Submitting…" : "Contribute"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={tosOpen} onOpenChange={setTosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contributor guidelines</DialogTitle>
            <DialogDescription>One-time agreement before your first upload.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Only upload OA material you have the right to share — no NDAs, no copyrighted books.</li>
            <li>Every view is watermarked and logged. Misuse will result in your account being blocked.</li>
            <li>Three reports on a file auto-hide it pending admin review.</li>
            <li>Your identity is hidden from viewers by default. Per-upload toggle controls credit.</li>
          </ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTosOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                localStorage.setItem(TOS_KEY, "1");
                setTosAccepted(true);
                setTosOpen(false);
              }}
            >
              I agree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
