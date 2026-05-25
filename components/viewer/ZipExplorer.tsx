"use client";
import { useEffect, useState } from "react";
import JSZip from "jszip";
import { useViewToken } from "./use-view-token";
import { Watermark } from "./Watermark";
import { File as FileIcon, Folder } from "lucide-react";

interface ZipEntry {
  name: string;
  size: number;
  dir: boolean;
}

/**
 * Streams the ZIP through our proxy, parses it client-side with JSZip, and
 * lets the user preview text/image entries inline. We never offer a "save"
 * action — entries render in the same locked-down surface as everything else.
 */
export function ZipExplorer({ fileId, viewerEmail }: { fileId: string; viewerEmail: string }) {
  const { src, error } = useViewToken(fileId);
  const [zip, setZip] = useState<JSZip | null>(null);
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [selected, setSelected] = useState<{ name: string; kind: "text" | "image" | "binary"; content: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await fetch(src);
      const buf = await res.arrayBuffer();
      const z = await JSZip.loadAsync(buf);
      if (cancelled) return;
      const list: ZipEntry[] = [];
      z.forEach((path, e) => list.push({ name: path, size: 0, dir: e.dir }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setZip(z);
      setEntries(list);
      setLoading(false);
    })().catch((e) => {
      console.error("[zip] load failed", e);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  async function open(entry: ZipEntry) {
    if (!zip || entry.dir) return;
    const f = zip.file(entry.name);
    if (!f) return;
    const lower = entry.name.toLowerCase();
    if (/\.(png|jpe?g|gif|webp)$/.test(lower)) {
      const blob = await f.async("blob");
      const url = URL.createObjectURL(blob);
      setSelected({ name: entry.name, kind: "image", content: url });
    } else if (/\.(txt|md|json|csv|js|ts|tsx|jsx|py|java|cpp|c|h|sql|yml|yaml|sh)$/.test(lower)) {
      const txt = await f.async("string");
      setSelected({ name: entry.name, kind: "text", content: txt });
    } else {
      setSelected({ name: entry.name, kind: "binary", content: null });
    }
  }

  if (error) return <Msg>Couldn’t load this ZIP.</Msg>;
  if (loading || !src) return <Msg>Loading archive…</Msg>;

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border bg-card">
        <div className="border-b p-3 text-sm font-medium">Files in archive</div>
        <ul className="max-h-[60vh] divide-y overflow-y-auto text-sm">
          {entries.map((e) => (
            <li key={e.name}>
              <button
                onClick={() => open(e)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"
                disabled={e.dir}
              >
                {e.dir ? <Folder className="h-4 w-4 text-muted-foreground" /> : <FileIcon className="h-4 w-4 text-muted-foreground" />}
                <span className="truncate">{e.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div
        className="viewer-surface relative min-h-[60vh] rounded-lg border bg-black/40 p-4"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {!selected && (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Select a file from the archive to preview.
          </div>
        )}
        {selected?.kind === "text" && (
          <pre className="no-select-no-drag max-h-[60vh] overflow-auto rounded bg-background/40 p-4 text-xs">
            {selected.content}
          </pre>
        )}
        {selected?.kind === "image" && selected.content && (
          <img src={selected.content} alt="" draggable={false} className="no-select-no-drag mx-auto max-h-[60vh]" />
        )}
        {selected?.kind === "binary" && (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Preview not supported for this file type.
          </div>
        )}
        <Watermark email={viewerEmail} />
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
