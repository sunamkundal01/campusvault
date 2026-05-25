/**
 * In-process sliding-window limiter. Per-instance only — fine for the Vercel
 * Hobby + single-region setup we're targeting. Swap for Upstash Redis if/when
 * we move to multi-region.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = buckets.get(key) ?? [];
  const cutoff = now - windowMs;
  const fresh = arr.filter((t) => t > cutoff);
  if (fresh.length >= limit) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}
