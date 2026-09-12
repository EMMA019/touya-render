import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Single-instance JSON file + memory fallback.
 * Swap the persist/read pair later (KV) without touching callers.
 */
export type JsonStore<T extends object> = {
  read: () => Promise<T>;
  persist: (store: T) => Promise<void>;
  enqueue: <R>(job: () => Promise<R>) => Promise<R>;
  resetMemory: () => void;
};

export function createJsonStore<T extends object>(options: {
  envKey: string;
  filename: string;
  empty: () => T;
}): JsonStore<T> {
  let memory = options.empty();
  let writeChain: Promise<void> = Promise.resolve();
  let warnedReadonly = false;

  function storePath(): string {
    return process.env[options.envKey]?.trim() || path.join(process.cwd(), "data", options.filename);
  }

  async function read(): Promise<T> {
    try {
      const raw = await readFile(storePath(), "utf8");
      const parsed = JSON.parse(raw) as T;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // missing or unreadable — fall through
    }
    return memory;
  }

  async function persist(store: T) {
    memory = store;
    try {
      const dest = storePath();
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, JSON.stringify(store), "utf8");
    } catch {
      if (!warnedReadonly) {
        warnedReadonly = true;
        console.warn(`[touya] ${options.filename} is memory-only (filesystem not writable).`);
      }
    }
  }

  function enqueue<R>(job: () => Promise<R>): Promise<R> {
    const run = writeChain.then(job, job);
    writeChain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  function resetMemory() {
    memory = options.empty();
  }

  return { read, persist, enqueue, resetMemory };
}
