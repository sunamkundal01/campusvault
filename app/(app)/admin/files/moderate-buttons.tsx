"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ModerateButtons({ fileId, status }: { fileId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject" | "remove") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/files/${fileId}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Marked ${action}.`);
      router.refresh();
    } catch {
      toast.error("Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      {status !== "approved" && (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => act("approve")}>
          Approve
        </Button>
      )}
      {status !== "rejected" && status !== "removed" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => act("reject")}>
          Reject
        </Button>
      )}
      {status !== "removed" && (
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => act("remove")}>
          Remove
        </Button>
      )}
    </div>
  );
}
