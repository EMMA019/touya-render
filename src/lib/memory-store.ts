import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CharacterId } from "./character-types";
import { MEMORY_MAX_FACTS, MEMORY_STORE_FILENAME } from "./config";
import type { MemoryFact } from "./memory-extract";

type StoredFact = MemoryFact & { at: string };

type PairRecord = { facts: StoredFact[] };

type StoreShape = { pairs: Record<string, PairRecord> };

const memory: StoreShape = { pairs: {} };
let writeChain: Promise<void> = Promise.resolve();

function storePath(): string {
  return (
    process.env.MEMORY_STORE_PATH?.trim() ||
    path.join(process.cwd(), "data", MEMORY_STORE_FILENAME)
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

export async function readMemory(
  visitorId: string,
  characterId: CharacterId
): Promise<StoredFact[]> {
  return enqueue(async () => {
    const store = await readStore();
    return store.pairs[pairKey(visitorId, characterId)]?.facts ?? [];
  });
}

export async function rememberFacts(
  visitorId: string,
  characterId: CharacterId,
  incoming: MemoryFact[],
  now = new Date()
): Promise<StoredFact[]> {
  if (incoming.length === 0) {
    return readMemory(visitorId, characterId);
  }
  return enqueue(async () => {
    const store = await readStore();
    const key = pairKey(visitorId, characterId);
    const current = store.pairs[key]?.facts ?? [];
    const stamped = incoming.map((fact) => ({
      ...fact,
      at: now.toISOString(),
    }));
    const merged = [...current];
    for (const fact of stamped) {
      const idx = merged.findIndex(
        (row) => row.kind === fact.kind && row.text === fact.text
      );
      if (idx >= 0) merged[idx] = fact;
      else merged.push(fact);
    }
    const facts = merged.slice(-MEMORY_MAX_FACTS);
    store.pairs[key] = { facts };
    await persist(store);
    return facts;
  });
}

export async function forgetFact(
  visitorId: string,
  characterId: CharacterId,
  text: string
): Promise<StoredFact[]> {
  return enqueue(async () => {
    const store = await readStore();
    const key = pairKey(visitorId, characterId);
    const current = store.pairs[key]?.facts ?? [];
    const facts = current.filter((row) => row.text !== text);
    store.pairs[key] = { facts };
    await persist(store);
    return facts;
  });
}

export function resetMemoryStore() {
  memory.pairs = {};
}
