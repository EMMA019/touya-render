import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { SEXUAL_BLOCK_MS } from "./config";

test("third sexual strike blocks the visitor+character pair", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-sex-"));
  process.env.SEXUAL_STORE_PATH = path.join(dir, "strikes.json");
  const { bumpSexualStrike, readSexualStrike, resetSexualStrikeMemory } =
    await import("./sexual-strikes");
  resetSexualStrikeMemory();
  const now = 1_000_000;
  const one = await bumpSexualStrike("v1", "hiyori", now);
  const two = await bumpSexualStrike("v1", "hiyori", now + 1);
  const three = await bumpSexualStrike("v1", "hiyori", now + 2);
  assert.equal(one.level, 1);
  assert.equal(two.level, 2);
  assert.equal(three.level, 3);
  assert.equal(three.blocked, true);
  assert.equal(three.blockedUntil, now + 2 + SEXUAL_BLOCK_MS);

  const other = await readSexualStrike("v1", "rione", now + 3);
  assert.equal(other.blocked, false);
  assert.equal(other.count, 0);

  const expired = await readSexualStrike("v1", "hiyori", now + 2 + SEXUAL_BLOCK_MS + 1);
  assert.equal(expired.blocked, false);
  assert.equal(expired.count, 0);
  await rm(dir, { recursive: true, force: true });
});
