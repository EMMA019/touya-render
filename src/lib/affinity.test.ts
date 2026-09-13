import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  EMPTY_AFFINITY,
  affinityLevelUpMessage,
  clampAffinityDelta,
  levelFromCount,
  shouldIncrementAffinity,
  toAffinityEvent,
} from "./affinity-types";

test("levelFromCount maps thresholds from shared/affinity.json", () => {
  const zero = levelFromCount(0);
  assert.equal(zero.level, 0);
  assert.equal(zero.name, "知り合い");
  assert.equal(zero.nextAt, 10);
  assert.equal(zero.progress, 0);
  assert.equal(zero.remainingToNext, 10);
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
  assert.equal(sixty.remainingToNext, null);

  const over = levelFromCount(99);
  assert.equal(over.level, 3);
  assert.equal(over.name, "絆");
  assert.equal(over.nextAt, null);
});

test("toAffinityEvent emits stage-specific band copy once on a crossing", () => {
  const beat = toAffinityEvent(levelFromCount(29), levelFromCount(30));
  assert.equal(beat.leveledUp, true);
  assert.equal(beat.leveledDown, false);
  assert.equal(beat.previousName, "仲良し");
  assert.equal(beat.name, "特別");
  assert.equal(beat.affinityDelta, 1);
  assert.equal(beat.levelUpMessage, "特別になった。距離が縮まった。特別な話は、ここから。");
  assert.equal(beat.bandEvent?.flag, "band:特別");
  assert.equal(beat.bandEvent?.blurb, "距離が縮まった。特別な話は、ここから。");
  assert.equal(beat.affinityToast, null);
  assert.equal(affinityLevelUpMessage("特別"), "特別になった");
  assert.equal(toAffinityEvent(levelFromCount(10), levelFromCount(11)).leveledUp, false);
  assert.equal(toAffinityEvent(levelFromCount(10), levelFromCount(11)).affinityToast, "少し親しくなった");
});

test("toAffinityEvent reports a drop without a level-up banner", () => {
  const drop = toAffinityEvent(levelFromCount(10), levelFromCount(9), -1);
  assert.equal(drop.leveledDown, true);
  assert.equal(drop.leveledUp, false);
  assert.equal(drop.name, "知り合い");
  assert.equal(drop.levelUpMessage, null);
  assert.equal(drop.bandEvent, null);
  assert.equal(drop.affinityToast, null);
});

test("clampAffinityDelta allows -1 / +1 / +2 only", () => {
  assert.equal(clampAffinityDelta(-4), -1);
  assert.equal(clampAffinityDelta(9), 2);
  assert.equal(clampAffinityDelta(0.8), 0);
});

test("shouldIncrementAffinity follows the chat consume path, not greeting seeds", () => {
  assert.equal(shouldIncrementAffinity({ consumedTurn: true }), true);
  assert.equal(shouldIncrementAffinity({ consumedTurn: false }), false);
});

test("applyAffinityDelta persists -1 / +1 / +2 with a floor of 0", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-affinity-"));
  process.env.AFFINITY_STORE_PATH = path.join(dir, "affinity.json");
  const { applyAffinityDelta, incrementAffinity, readAffinity, readAffinityMap, resetAffinityStore } =
    await import("./affinity");
  resetAffinityStore();

  const first = await incrementAffinity("v1", "hiyori");
  assert.equal(first.count, 1);
  assert.equal(first.name, "知り合い");
  assert.equal(first.affinityDelta, 1);
  assert.equal(first.leveledUp, false);

  const warm = await applyAffinityDelta("v1", "hiyori", 2);
  assert.equal(warm.count, 3);
  assert.equal(warm.affinityDelta, 2);

  const down = await applyAffinityDelta("v1", "hiyori", -1);
  assert.equal(down.count, 2);
  assert.equal(down.affinityDelta, -1);

  await applyAffinityDelta("v1", "hiyori", -1);
  const toZero = await applyAffinityDelta("v1", "hiyori", -1);
  assert.equal(toZero.count, 0);
  assert.equal(toZero.affinityDelta, -1);
  const floored = await applyAffinityDelta("v1", "hiyori", -1);
  assert.equal(floored.count, 0);
  assert.equal(floored.affinityDelta, 0);

  const otherChar = await incrementAffinity("v1", "rione");
  assert.equal(otherChar.count, 1);
  const otherVisitor = await incrementAffinity("v2", "hiyori");
  assert.equal(otherVisitor.count, 1);
  assert.equal((await readAffinity("v1", "hiyori")).count, 0);

  const map = await readAffinityMap("v1");
  assert.equal(map.hiyori.count, 0);
  assert.equal(map.rione.count, 1);
  assert.equal(map.shiraishi, undefined);

  await rm(dir, { recursive: true, force: true });
});

test("crossing a band is one-shot even if the pair later drops and climbs again", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-affinity-"));
  process.env.AFFINITY_STORE_PATH = path.join(dir, "affinity-bands.json");
  const { applyAffinityDelta, resetAffinityStore } = await import("./affinity");
  resetAffinityStore();

  for (let i = 0; i < 9; i += 1) await applyAffinityDelta("v1", "hiyori", 1);
  const firstCross = await applyAffinityDelta("v1", "hiyori", 1);
  assert.equal(firstCross.count, 10);
  assert.equal(firstCross.leveledUp, true);
  assert.equal(firstCross.bandEvent?.name, "仲良し");

  const dropped = await applyAffinityDelta("v1", "hiyori", -1);
  assert.equal(dropped.leveledDown, true);
  const recross = await applyAffinityDelta("v1", "hiyori", 1);
  assert.equal(recross.count, 10);
  assert.equal(recross.leveledUp, false);
  assert.equal(recross.bandEvent, null);

  await rm(dir, { recursive: true, force: true });
});
