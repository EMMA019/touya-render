import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SEXUAL_BLOCK_MS, SEXUAL_STORE_FILENAME } from "./config";
import type { CharacterId } from "./character-types";
import type { SexualLevel } from "./sexual-refusals";

type StrikeRecord = {
  count: number;
  blockedUntil: number;
};

type StoreShape = {
  pairs: Record<string, StrikeRecord>;
};

const memory: StoreShape = { pairs: {} };
let writeChain: Promise<void> = Promise.resolve();

function storePath(): string {
  return (
    process.env.SEXUAL_STORE_PATH?.trim() ||
    path.join(process.cwd(), "data", SEXUAL_STORE_FILENAME)
  );
}

function pairKey(visitorId: string, characterId: CharacterId): string {
  return `${visitorId}:${characterId}`;
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (parsed && typeof parsed === "object" && parsed.pairs) return parsed;
  } catch {
    // fall through
  }
  return memory;
}

async function persist(store: StoreShape) {
  memory.pairs = store.pairs;
  try {
    const dest = storePath();
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, JSON.stringify(store), "utf8");
  } catch {
    // memory-only on read-only FS
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

export type StrikeState = {
  count: number;
  blockedUntil: number;
  blocked: boolean;
};

export function effectiveStrike(record: StrikeRecord, now: number): StrikeState {
  if (record.blockedUntil > now) {
    return { count: record.count, blockedUntil: record.blockedUntil, blocked: true };
  }
  if (record.blockedUntil > 0 && now >= record.blockedUntil) {
    return { count: 0, blockedUntil: 0, blocked: false };
  }
  return { count: record.count, blockedUntil: 0, blocked: false };
}

export async function readSexualStrike(
  visitorId: string,
  characterId: CharacterId,
  now = Date.now()
): Promise<StrikeState> {
  return enqueue(async () => {
    const store = await readStore();
    const raw = store.pairs[pairKey(visitorId, characterId)] ?? {
      count: 0,
      blockedUntil: 0,
    };
    return effectiveStrike(raw, now);
  });
}

export async function bumpSexualStrike(
  visitorId: string,
  characterId: CharacterId,
  now = Date.now()
): Promise<StrikeState & { level: SexualLevel }> {
  return enqueue(async () => {
    const store = await readStore();
    const key = pairKey(visitorId, characterId);
    const current = effectiveStrike(
      store.pairs[key] ?? { count: 0, blockedUntil: 0 },
      now
    );
    const count = Math.min(3, current.count + 1) as SexualLevel;
    const blockedUntil = count >= 3 ? now + SEXUAL_BLOCK_MS : 0;
    store.pairs[key] = { count, blockedUntil };
    await persist(store);
    return {
      count,
      level: count,
      blockedUntil,
      blocked: blockedUntil > now,
    };
  });
}

export function resetSexualStrikeMemory() {
  memory.pairs = {};
}
