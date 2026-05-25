import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

const BRANCHES: Record<string, string> = {
  bcse: "CSE", bece: "ECE", beee: "EEE", bmee: "ME", bcve: "Civil",
  bche: "Chemical", bmte: "Metallurgy", bite: "IT",
};

/**
 * Parse a college email of the form `<name>_<year><branch><roll>@nitsri.ac.in`.
 * Returns { batchYear, branch, branchLabel, roll } or null when it doesn't match.
 */
export function parseCollegeEmail(email: string) {
  const m = email.toLowerCase().match(/_(\d{4})([a-z]+)(\d+)@nitsri\.ac\.in$/);
  if (!m) return null;
  const branch = m[2];
  return {
    batchYear: Number(m[1]),
    branch,
    branchLabel: BRANCHES[branch] ?? branch.toUpperCase(),
    roll: m[3],
  };
}
