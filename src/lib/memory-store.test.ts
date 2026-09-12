import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

test("memory is scoped to visitor+character", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-mem-"));
  process.env.MEMORY_STORE_PATH = path.join(dir, "memory.json");
  const { rememberFacts, readMemory, resetMemoryStore } = await import("./memory-store");
  resetMemoryStore();
  await rememberFacts("v1", "hiyori", [{ kind: "profile", text: "呼び名は太郎" }]);
  const hiyori = await readMemory("v1", "hiyori");
  const rione = await readMemory("v1", "rione");
  assert.equal(hiyori[0]?.text, "呼び名は太郎");
  assert.equal(rione.length, 0);
  const { forgetFact } = await import("./memory-store");
  const after = await forgetFact("v1", "hiyori", "呼び名は太郎");
  assert.equal(after.length, 0);
  await rm(dir, { recursive: true, force: true });
});
