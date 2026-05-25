"use client";
import { useEffect, useRef, useState } from "react";
import { useViewToken } from "./use-view-token";
import { Watermark } from "./Watermark";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * pdf.js–based viewer. Each page is rendered to a canvas so users can't
 * trivially "View source → Save". The file bytes still come through our
 * proxy stream (`/api/files/stream/[token]`); pdf.js handles HTTP Range
 * requests automatically when the server sets `Accept-Ranges: bytes`.
 */
export function PdfViewer({ fileId, viewerEmail }: { fileId: string; viewerEmail: string }) {
  const { src, error } = useViewToken(fileId);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  // pdf.js documents aren't serializable; keep as a ref instead of state.
  const docRef = useRef<unknown>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

      const loadingTask = pdfjs.getDocument({ url: src, withCredentials: false });
      const doc = await loadingTask.promise;
      if (cancelled) return;
      docRef.current = doc;
      setNumPages(doc.numPages);
      setPage(1);
      setLoading(false);
    })().catch((e) => {
      console.error("[pdf] load failed", e);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const doc = docRef.current as { getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> } | null;
    if (!doc || !wrapRef.current) return;
    let cancelled = false;

    (async () => {
      const p = await doc.getPage(page);
      if (cancelled || !wrapRef.current) return;
      const containerWidth = wrapRef.current.clientWidth - 24;
      const baseViewport = p.getViewport({ scale: 1 });
      const scale = Math.min(2.5, containerWidth / baseViewport.width);
      const viewport = p.getViewport({ scale });

      const canvas = wrapRef.current.querySelector("canvas") as HTMLCanvasElement | null;
      const c = canvas ?? document.createElement("canvas");
      const ratio = window.devicePixelRatio || 1;
      c.width = Math.floor(viewport.width * ratio);
      c.height = Math.floor(viewport.height * ratio);
      c.style.width = `${viewport.width}px`;
      c.style.height = `${viewport.height}px`;
      const ctx = c.getContext("2d")!;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!canvas) wrapRef.current.appendChild(c);

      await p.render({ canvasContext: ctx, viewport }).promise;
    })().catch((e) => console.error("[pdf] render failed", e));

    return () => {
      cancelled = true;
    };
  }, [page, numPages]);

  if (error) return <Msg>Couldn’t load this PDF.</Msg>;
  if (!src || loading) return <Msg>Preparing PDF…</Msg>;

  return (
    <div className="space-y-3">
      <div
        ref={wrapRef}
        className="viewer-surface relative grid place-items-center overflow-auto rounded-lg border bg-black/50 p-3"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{ minHeight: 520 }}
      >
        <Watermark email={viewerEmail} />
      </div>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {numPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
          disabled={page >= numPages}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Msg({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-64 place-items-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
