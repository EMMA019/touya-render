import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEBUG_UNLIMITED_REMAINING,
  FREE_DAILY_TURNS,
  PREMIUM_DAILY_TURNS,
  REWARD_EXTRA_TURNS,
  REWARD_MAX_PER_DAY,
  USAGE_STORE_FILENAME,
  debugUnlimitedEnabled,
  jstDayKey,
} from "./config";
import { readPremium } from "./entitlements";
import type { Quota } from "./quota-types";

export type { Quota };

type DayEntry = { used: number; extra: number; rewards: number };
type DayBucket = Record<string, DayEntry | number>;
type StoreShape = {
  days: Record<string, DayBucket>;
};

const memory: StoreShape = { days: {} };
let writeChain: Promise<void> = Promise.resolve();
let warnedReadonly = false;

function storePath(): string {
  return (
    process.env.USAGE_STORE_PATH?.trim() ||
    path.join(process.cwd(), "data", USAGE_STORE_FILENAME)
  );
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (parsed && typeof parsed === "object" && parsed.days) {
      return parsed;
    }
  } catch {
    // missing file or unreadable — fall through to memory
  }
  return memory;
}

function prune(store: StoreShape, today: string) {
  for (const day of Object.keys(store.days)) {
    if (day < today) delete store.days[day];
  }
}

async function persist(store: StoreShape) {
  memory.days = store.days;
  try {
    const dest = storePath();
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, JSON.stringify(store), "utf8");
  } catch {
    if (!warnedReadonly) {
      warnedReadonly = true;
      console.warn(
        "[touya] usage store is memory-only (filesystem not writable). Fine for a single instance."
      );
    }
  }
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = writeChain.then(job, job);
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function asEntry(value: DayEntry | number | undefined): DayEntry {
  if (typeof value === "number") return { used: value, extra: 0, rewards: 0 };
  if (value && typeof value === "object") {
    return {
      used: Number(value.used) || 0,
      extra: Number(value.extra) || 0,
      rewards: Number(value.rewards) || 0,
    };
  }
  return { used: 0, extra: 0, rewards: 0 };
}

function dailyLimit(premium: boolean, extra: number): number {
  return (premium ? PREMIUM_DAILY_TURNS : FREE_DAILY_TURNS) + extra;
}

function toQuota(entry: DayEntry, premium: boolean, day: string): Quota {
  const limit = dailyLimit(premium, entry.extra);
  const debugUnlimited = debugUnlimitedEnabled();
  return {
    used: entry.used,
    extra: entry.extra,
    limit,
    remaining: debugUnlimited
      ? DEBUG_UNLIMITED_REMAINING
      : Math.max(0, limit - entry.used),
    day,
    premium,
    rewardsLeft: Math.max(0, REWARD_MAX_PER_DAY - entry.rewards),
    debugUnlimited,
  };
}

export function emptyQuota(): Quota {
  return toQuota({ used: 0, extra: 0, rewards: 0 }, false, "");
}

export async function readQuota(anonKey: string, now = new Date()): Promise<Quota> {
  const day = jstDayKey(now);
  const premium = await readPremium(anonKey);
  return enqueue(async () => {
    const store = await readStore();
    return toQuota(asEntry(store.days[day]?.[anonKey]), premium, day);
  });
}

export async function consumeTurn(
  anonKey: string,
  now = new Date()
): Promise<Quota & { allowed: boolean }> {
  const day = jstDayKey(now);
  const premium = await readPremium(anonKey);
  return enqueue(async () => {
    const store = await readStore();
    prune(store, day);
    if (!store.days[day]) store.days[day] = {};
    const entry = asEntry(store.days[day][anonKey]);
    const limit = dailyLimit(premium, entry.extra);
    if (!debugUnlimitedEnabled() && entry.used >= limit) {
      return { allowed: false, ...toQuota(entry, premium, day) };
    }
    entry.used += 1;
    store.days[day][anonKey] = entry;
    await persist(store);
    return { allowed: true, ...toQuota(entry, premium, day) };
  });
}

export async function grantReward(
  anonKey: string,
  now = new Date()
): Promise<Quota & { granted: boolean; reason?: string }> {
  const day = jstDayKey(now);
  const premium = await readPremium(anonKey);
  return enqueue(async () => {
    const store = await readStore();
    prune(store, day);
    if (!store.days[day]) store.days[day] = {};
    const entry = asEntry(store.days[day][anonKey]);
    if (entry.rewards >= REWARD_MAX_PER_DAY) {
      return {
        granted: false,
        reason: "reward_cap",
        ...toQuota(entry, premium, day),
      };
    }
    entry.rewards += 1;
    entry.extra += REWARD_EXTRA_TURNS;
    store.days[day][anonKey] = entry;
    await persist(store);
    return { granted: true, ...toQuota(entry, premium, day) };
  });
}

/** Test helper — does not touch disk if USAGE_STORE_PATH is unset and we only mutate memory. */
export function resetUsageMemory() {
  memory.days = {};
}
