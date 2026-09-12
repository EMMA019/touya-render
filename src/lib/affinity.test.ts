import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { EMPTY_AFFINITY, levelFromCount, shouldIncrementAffinity } from "./affinity-types";

test("levelFromCount maps thresholds from shared/affinity.json", () => {
  const zero = levelFromCount(0);
  assert.equal(zero.level, 0);
  assert.equal(zero.name, "知り合い");
  assert.equal(zero.nextAt, 10);
  assert.equal(zero.progress, 0);
  assert.deepEqual(EMPTY_AFFINITY, zero);

  const nine = levelFromCount(9);
  assert.equal(nine.level, 0);
  assert.equal(nine.name, "知り合い");
  assert.equal(nine.nextAt, 10);
  assert.equal(nine.progress, 0.9);

  const ten = levelFromCount(10);
  assert.equal(ten.level, 1);
  assert.equal(ten.name, "仲良し");
  assert.equal(ten.nextAt, 30);
  assert.equal(ten.progress, 0);

  const thirty = levelFromCount(30);
  assert.equal(thirty.level, 2);
  assert.equal(thirty.name, "特別");
  assert.equal(thirty.nextAt, 60);

  const sixty = levelFromCount(60);
  assert.equal(sixty.level, 3);
  assert.equal(sixty.name, "絆");
  assert.equal(sixty.nextAt, null);
  assert.equal(sixty.progress, 1);

  const over = levelFromCount(99);
  assert.equal(over.level, 3);
  assert.equal(over.name, "絆");
  assert.equal(over.nextAt, null);
});

test("shouldIncrementAffinity follows the chat consume path, not greeting seeds", () => {
  assert.equal(shouldIncrementAffinity({ consumedTurn: true }), true);
  assert.equal(shouldIncrementAffinity({ consumedTurn: false }), false);
});

test("incrementAffinity is permanent per visitor×character and does not reset daily", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-affinity-"));
  process.env.AFFINITY_STORE_PATH = path.join(dir, "affinity.json");
  const { incrementAffinity, readAffinity, readAffinityMap, resetAffinityStore } = await import("./affinity");
  resetAffinityStore();

  const first = await incrementAffinity("v1", "hiyori");
  assert.equal(first.count, 1);
  assert.equal(first.name, "知り合い");
  const second = await incrementAffinity("v1", "hiyori");
  assert.equal(second.count, 2);
  assert.equal((await readAffinity("v1", "hiyori")).count, 2);

  const otherChar = await incrementAffinity("v1", "rione");
  assert.equal(otherChar.count, 1);
  const otherVisitor = await incrementAffinity("v2", "hiyori");
  assert.equal(otherVisitor.count, 1);
  assert.equal((await readAffinity("v1", "hiyori")).count, 2);

  const map = await readAffinityMap("v1");
  assert.equal(map.hiyori.count, 2);
  assert.equal(map.rione.count, 1);
  assert.equal(map.shiraishi, undefined);

  await rm(dir, { recursive: true, force: true });
});
