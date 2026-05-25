"use client";
import { useMemo } from "react";

/**
 * Tiled diagonal watermark of the viewer's email. Sits in an overlay above
 * file content (`pointer-events: none`) so it can't be hidden by inspect-only
 * tweaks without also hiding the content. Encoded inline as a data URI so
 * it can't be requested separately and stripped.
 */
export function Watermark({ email }: { email: string }) {
  const dataUri = useMemo(() => {
    const text = email.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='420' height='220'>
        <g transform='rotate(-28 210 110)' fill='rgba(120,120,120,0.18)' font-family='ui-sans-serif, system-ui, sans-serif' font-size='14'>
          <text x='20' y='40'>${text}</text>
          <text x='20' y='110'>${text}</text>
          <text x='20' y='180'>${text}</text>
        </g>
      </svg>`.trim();
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, [email]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay"
      style={{ backgroundImage: dataUri, backgroundRepeat: "repeat" }}
    />
  );
}
