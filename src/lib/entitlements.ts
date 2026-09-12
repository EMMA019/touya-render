import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENTITLEMENTS_STORE_FILENAME } from "./config";

type RecordShape = { premium: boolean; source: "play_billing_stub" };
type StoreShape = { ids: Record<string, RecordShape> };

const memory: StoreShape = { ids: {} };
let writeChain: Promise<void> = Promise.resolve();

function storePath(): string {
  return (
    process.env.ENTITLEMENTS_STORE_PATH?.trim() ||
    path.join(process.cwd(), "data", ENTITLEMENTS_STORE_FILENAME)
  );
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (parsed && typeof parsed === "object" && parsed.ids) return parsed;
  } catch {
    // fall through
  }
  return memory;
}

async function persist(store: StoreShape) {
  memory.ids = store.ids;
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

/** Play Billing will write this later. Web MVP stays ads-first. */
export async function readPremium(anonKey: string): Promise<boolean> {
  return enqueue(async () => {
    const store = await readStore();
    return Boolean(store.ids[anonKey]?.premium);
  });
}

export async function grantPremiumStub(anonKey: string): Promise<void> {
  return enqueue(async () => {
    const store = await readStore();
    store.ids[anonKey] = { premium: true, source: "play_billing_stub" };
    await persist(store);
  });
}

export function resetEntitlementsMemory() {
  memory.ids = {};
}
