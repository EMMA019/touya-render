import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { resolveBondStage } from "./bond-types";

test("bond stage maps days and facts without numbers in the UI layer", () => {
  assert.equal(resolveBondStage(0, 0), "first");
  assert.equal(resolveBondStage(1, 0), "first");
  assert.equal(resolveBondStage(2, 0), "familiar");
  assert.equal(resolveBondStage(4, 0), "regular");
  assert.equal(resolveBondStage(1, 3), "regular");
});

test("touchBond counts unique JST days per visitor and character", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-bond-"));
  process.env.BOND_STORE_PATH = path.join(dir, "bonds.json");
  const { touchBond, readBond, resetBondStore } = await import("./bond");
  resetBondStore();
  const dayOne = new Date("2026-09-12T10:00:00.000Z");
  const sameDay = new Date("2026-09-12T14:00:00.000Z");
  const dayTwo = new Date("2026-09-12T15:30:00.000Z");
  await touchBond("v1", "hiyori", 0, dayOne);
  await touchBond("v1", "hiyori", 0, sameDay);
  const second = await touchBond("v1", "hiyori", 1, dayTwo);
  assert.equal(second.daysMet, 2);
  assert.equal(second.stage, "familiar");
  assert.equal(second.daysAway, 1);
  assert.equal(second.streak, 2);
  const other = await readBond("v1", "rione", 0);
  assert.equal(other.daysMet, 0);
  await rm(dir, { recursive: true, force: true });
});
