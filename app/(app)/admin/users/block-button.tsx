"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function BlockButton({ userId, isBlocked }: { userId: string; isBlocked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isBlocked: !isBlocked }),
      });
      if (!res.ok) throw new Error();
      toast.success(isBlocked ? "Unblocked." : "Blocked.");
      router.refresh();
    } catch {
      toast.error("Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant={isBlocked ? "secondary" : "destructive"} disabled={busy} onClick={toggle}>
      {isBlocked ? "Unblock" : "Block"}
    </Button>
  );
}
