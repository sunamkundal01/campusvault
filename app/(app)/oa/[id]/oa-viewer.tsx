"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileViewer } from "@/components/viewer/FileViewer";
import { Flag } from "lucide-react";
import { toast } from "sonner";

export interface OaViewerFile {
  id: string;
  kind: "pdf" | "image" | "zip" | "doc" | "other";
  displayName: string;
  attribution: string;
  isOwnUpload: boolean;
}

const REASONS = [
  { v: "not_oa", label: "Not OA content" },
  { v: "copyrighted", label: "Copyright violation" },
  { v: "low_quality", label: "Low quality / unreadable" },
  { v: "offensive", label: "Offensive content" },
  { v: "other", label: "Other" },
] as const;

export function OaViewer({ files, viewerEmail }: { files: OaViewerFile[]; viewerEmail: string }) {
  const [active, setActive] = useState(files[0]?.id);
  const [reportTarget, setReportTarget] = useState<OaViewerFile | null>(null);
  const file = files.find((f) => f.id === active) ?? files[0];

  return (
    <div className="space-y-3">
      <Tabs value={active} onValueChange={setActive}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex-wrap">
            {files.map((f) => (
              <TabsTrigger key={f.id} value={f.id}>
                <span className="max-w-[200px] truncate">{f.displayName}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Contributed by {file.attribution}</span>
            {!file.isOwnUpload && (
              <Button variant="ghost" size="sm" onClick={() => setReportTarget(file)}>
                <Flag className="h-3.5 w-3.5" /> Report
              </Button>
            )}
          </div>
        </div>

        {files.map((f) => (
          <TabsContent key={f.id} value={f.id} className="animate-fade-in">
            <FileViewer file={{ id: f.id, kind: f.kind, displayName: f.displayName }} viewerEmail={viewerEmail} />
          </TabsContent>
        ))}
      </Tabs>

      <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
    </div>
  );
}

function ReportDialog({ target, onClose }: { target: OaViewerFile | null; onClose: () => void }) {
  const [reason, setReason] = useState<(typeof REASONS)[number]["v"]>("not_oa");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!target) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/files/${target.id}/report`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, note }),
      });
      if (res.status === 409) toast.info("You already reported this file.");
      else if (!res.ok) toast.error("Couldn't submit report.");
      else {
        const j = await res.json();
        toast.success(j.autoHidden ? "Reported — hidden pending admin review." : "Thanks, we'll take a look.");
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this file</DialogTitle>
          <DialogDescription>
            Tell us what's wrong. Three reports auto-hide the file pending admin review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            {REASONS.map((r) => (
              <label key={r.v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="reason" value={r.v} checked={reason === r.v} onChange={() => setReason(r.v)} />
                {r.label}
              </label>
            ))}
          </div>
          <textarea
            className="w-full rounded-md border bg-background p-2 text-sm"
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
