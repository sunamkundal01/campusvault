import { cn } from "@/lib/utils";

interface Props {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  xs: "h-6 w-6 text-[10px] rounded-md",
  sm: "h-9 w-9 text-xs rounded-lg",
  md: "h-12 w-12 text-sm rounded-xl",
  lg: "h-16 w-16 text-lg rounded-2xl",
} as const;

/**
 * Deterministic gradient monogram for a company name.
 * No external logo API — keeps things self-contained and matches the
 * platform's privacy story (no third-party calls per page load).
 */
export function CompanyAvatar({ name, size = "md", className }: Props) {
  const initials = name
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  const hue2 = (hue + 35) % 360;

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center font-semibold text-white shadow-sm ring-1 ring-white/10",
        SIZES[size],
        className
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 70% 52%), hsl(${hue2} 70% 38%))`,
      }}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}
