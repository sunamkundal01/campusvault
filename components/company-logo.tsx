"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CompanyAvatar } from "@/components/company-avatar";
import { domainFor, logoUrl } from "@/lib/company-logos";

interface Props {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  xs: { wrap: "h-6 w-6 rounded-md", pad: "p-0.5" },
  sm: { wrap: "h-9 w-9 rounded-lg", pad: "p-1" },
  md: { wrap: "h-12 w-12 rounded-xl", pad: "p-1.5" },
  lg: { wrap: "h-16 w-16 rounded-2xl", pad: "p-2" },
} as const;

/**
 * Real company logo via Google's favicon CDN, with the deterministic monogram
 * underneath as a fallback. The monogram is always rendered first; the favicon
 * fades in on `onLoad`. On `onError`, the favicon is removed entirely and the
 * monogram stays.
 */
export function CompanyLogo({ name, size = "md", className }: Props) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const domain = domainFor(name);
  const sz = SIZES[size];

  if (!domain) {
    return <CompanyAvatar name={name} size={size} className={className} />;
  }

  return (
    <div className={cn("relative shrink-0", sz.wrap, className)}>
      <CompanyAvatar name={name} size={size} className="absolute inset-0 !shadow-none ring-0" />
      {state !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl(domain, 128)}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={cn(
            "absolute inset-0 h-full w-full bg-white object-contain transition-opacity duration-300",
            sz.wrap,
            sz.pad,
            state === "loaded" ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
}
