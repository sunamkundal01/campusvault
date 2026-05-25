"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  id: string;
  isAdmin: boolean;
  isAuthor: boolean;
  kind: "video" | "blog";
}

export function InterviewActions({ id, isAdmin }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Remove this entry?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/interviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Removed.");
      router.push("/interviews");
    } catch {
      toast.error("Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-end gap-2">
      {isAdmin && (
        <Button variant="destructive" size="sm" disabled={busy} onClick={remove}>
          Remove (admin)
        </Button>
      )}
    </div>
  );
}
