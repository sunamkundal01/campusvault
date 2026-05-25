"use client";
import { useViewToken } from "./use-view-token";
import { Watermark } from "./Watermark";

export function ImageViewer({ fileId, viewerEmail }: { fileId: string; viewerEmail: string }) {
  const { src, error } = useViewToken(fileId);

  if (error) return <ViewerMessage>Couldn’t load this image.</ViewerMessage>;
  if (!src) return <ViewerMessage>Preparing…</ViewerMessage>;

  return (
    <div
      className="viewer-surface relative grid place-items-center overflow-hidden rounded-lg border bg-black/40 p-4"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="no-select-no-drag max-h-[80vh] w-auto"
      />
      <Watermark email={viewerEmail} />
    </div>
  );
}

function ViewerMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-64 place-items-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
