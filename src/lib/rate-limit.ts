import { MIN_REQUEST_GAP_MS, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "./config";

type Bucket = {
  lastAt: number;
  hits: number[];
};

const buckets = new Map<string, Bucket>();

function bucket(id: string): Bucket {
  const existing = buckets.get(id);
  if (existing) return existing;
  const created = { lastAt: 0, hits: [] as number[] };
  buckets.set(id, created);
  return created;
}

export function checkRateLimit(visitorId: string, now = Date.now()): "ok" | "cooldown" | "busy" {
  const b = bucket(visitorId);
  if (now - b.lastAt < MIN_REQUEST_GAP_MS) return "cooldown";
  b.hits = b.hits.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (b.hits.length >= RATE_LIMIT_MAX) return "busy";
  b.lastAt = now;
  b.hits.push(now);
  return "ok";
}
