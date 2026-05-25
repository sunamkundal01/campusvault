"use client";
import { useEffect, useState } from "react";

export interface ViewTokenResult {
  token: string;
  mimeType: string;
  kind: "pdf" | "image" | "zip" | "doc" | "other";
  sizeBytes: number;
  displayName: string;
}

export function useViewToken(fileId: string | null) {
  const [data, setData] = useState<ViewTokenResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/files/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileId }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as ViewTokenResult;
        if (active) setData(json);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "failed");
      }
    })();
    return () => {
      active = false;
    };
  }, [fileId]);

  return { data, error, src: data ? `/api/files/stream/${data.token}` : null };
}
