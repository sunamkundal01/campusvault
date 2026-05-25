"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function LoginErrorModal({ title, body }: { title: string; body: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) router.replace("/login");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
