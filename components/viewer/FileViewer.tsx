"use client";
import { PdfViewer } from "./PdfViewer";
import { ImageViewer } from "./ImageViewer";
import { ZipExplorer } from "./ZipExplorer";

export interface ViewerFile {
  id: string;
  kind: "pdf" | "image" | "zip" | "doc" | "other";
  displayName: string;
}

export function FileViewer({ file, viewerEmail }: { file: ViewerFile; viewerEmail: string }) {
  if (file.kind === "pdf" || file.kind === "doc")
    return <PdfViewer fileId={file.id} viewerEmail={viewerEmail} />;
  if (file.kind === "image") return <ImageViewer fileId={file.id} viewerEmail={viewerEmail} />;
  if (file.kind === "zip") return <ZipExplorer fileId={file.id} viewerEmail={viewerEmail} />;

  return (
    <div className="grid h-64 place-items-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
      Preview not available for this file type.
    </div>
  );
}
