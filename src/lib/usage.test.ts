import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DEBUG_UNLIMITED_REMAINING, FREE_DAILY_TURNS, PREMIUM_DAILY_TURNS, REWARD_EXTRA_TURNS } from "./config";

test("caps free-tier turns at 10 per JST day", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-usage-"));
  process.env.USAGE_STORE_PATH = path.join(dir, "usage.json");
  process.env.ENTITLEMENTS_STORE_PATH = path.join(dir, "entitlements.json");
  delete process.env.TOUYA_DEBUG_UNLIMITED;
  delete process.env.TOUYA_PERSONAL;
  const { consumeTurn, resetUsageMemory } = await import("./usage");
  const { resetEntitlementsMemory } = await import("./entitlements");
  resetUsageMemory();
  resetEntitlementsMemory();
  const now = new Date("2026-09-12T10:00:00.000Z");
  let last = { allowed: true, used: 0, remaining: FREE_DAILY_TURNS };
  for (let i = 0; i < FREE_DAILY_TURNS; i += 1) {
    last = await consumeTurn("visitor-a", now);
    assert.equal(last.allowed, true);
  }
  const blocked = await consumeTurn("visitor-a", now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(last.used, FREE_DAILY_TURNS);
  await rm(dir, { recursive: true, force: true });
});

test("TOUYA_DEBUG_UNLIMITED=1 keeps remaining high after many turns", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-debug-quota-"));
  const prev = process.env.TOUYA_DEBUG_UNLIMITED;
  process.env.USAGE_STORE_PATH = path.join(dir, "usage.json");
  process.env.ENTITLEMENTS_STORE_PATH = path.join(dir, "entitlements.json");
  process.env.TOUYA_DEBUG_UNLIMITED = "1";
  try {
    const { consumeTurn, readQuota, resetUsageMemory } = await import("./usage");
    const { resetEntitlementsMemory } = await import("./entitlements");
    resetUsageMemory();
    resetEntitlementsMemory();
    const now = new Date("2026-09-12T10:00:00.000Z");
    let last = await consumeTurn("visitor-debug", now);
    for (let i = 1; i < 25; i += 1) {
      last = await consumeTurn("visitor-debug", now);
      assert.equal(last.allowed, true);
      assert.equal(last.debugUnlimited, true);
      assert.equal(last.remaining, DEBUG_UNLIMITED_REMAINING);
    }
    assert.equal(last.used, 25);
    const snapshot = await readQuota("visitor-debug", now);
    assert.equal(snapshot.debugUnlimited, true);
    assert.equal(snapshot.remaining, DEBUG_UNLIMITED_REMAINING);
  } finally {
    if (prev === undefined) delete process.env.TOUYA_DEBUG_UNLIMITED;
    else process.env.TOUYA_DEBUG_UNLIMITED = prev;
    await rm(dir, { recursive: true, force: true });
  }
});

test("TOUYA_PERSONAL=1 keeps remaining high after many turns", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-personal-quota-"));
  const prev = process.env.TOUYA_PERSONAL;
  const prevDebug = process.env.TOUYA_DEBUG_UNLIMITED;
  process.env.USAGE_STORE_PATH = path.join(dir, "usage.json");
  process.env.ENTITLEMENTS_STORE_PATH = path.join(dir, "entitlements.json");
  delete process.env.TOUYA_DEBUG_UNLIMITED;
  delete process.env.TOUYA_PERSONAL;
  process.env.TOUYA_PERSONAL = "1";
  try {
    const { consumeTurn, readQuota, resetUsageMemory } = await import("./usage");
    const { resetEntitlementsMemory } = await import("./entitlements");
    resetUsageMemory();
    resetEntitlementsMemory();
    const now = new Date("2026-09-12T10:00:00.000Z");
    let last = await consumeTurn("visitor-personal", now);
    for (let i = 1; i < 25; i += 1) {
      last = await consumeTurn("visitor-personal", now);
      assert.equal(last.allowed, true);
      assert.equal(last.debugUnlimited, true);
      assert.equal(last.remaining, DEBUG_UNLIMITED_REMAINING);
    }
    assert.equal(last.used, 25);
    const snapshot = await readQuota("visitor-personal", now);
    assert.equal(snapshot.debugUnlimited, true);
    assert.equal(snapshot.remaining, DEBUG_UNLIMITED_REMAINING);
  } finally {
    if (prev === undefined) delete process.env.TOUYA_PERSONAL;
    else process.env.TOUYA_PERSONAL = prev;
    if (prevDebug === undefined) delete process.env.TOUYA_DEBUG_UNLIMITED;
    else process.env.TOUYA_DEBUG_UNLIMITED = prevDebug;
    await rm(dir, { recursive: true, force: true });
  }
});

test("TOUYA_DEBUG_UNLIMITED unset still enforces the daily cap", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-debug-off-"));
  process.env.USAGE_STORE_PATH = path.join(dir, "usage.json");
  process.env.ENTITLEMENTS_STORE_PATH = path.join(dir, "entitlements.json");
  delete process.env.TOUYA_DEBUG_UNLIMITED;
  delete process.env.TOUYA_PERSONAL;
  const { consumeTurn, resetUsageMemory } = await import("./usage");
  const { resetEntitlementsMemory } = await import("./entitlements");
  resetUsageMemory();
  resetEntitlementsMemory();
  const now = new Date("2026-09-12T10:00:00.000Z");
  for (let i = 0; i < FREE_DAILY_TURNS; i += 1) {
    const row = await consumeTurn("visitor-off", now);
    assert.equal(row.allowed, true);
    assert.equal(row.debugUnlimited, false);
  }
  const blocked = await consumeTurn("visitor-off", now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.debugUnlimited, false);
  await rm(dir, { recursive: true, force: true });
});

test("quota day rolls at Japan midnight, not UTC", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-jst-"));
  process.env.USAGE_STORE_PATH = path.join(dir, "usage.json");
  process.env.ENTITLEMENTS_STORE_PATH = path.join(dir, "entitlements.json");
  delete process.env.TOUYA_DEBUG_UNLIMITED;
  delete process.env.TOUYA_PERSONAL;
  const { consumeTurn, resetUsageMemory } = await import("./usage");
  const { resetEntitlementsMemory } = await import("./entitlements");
  resetUsageMemory();
  resetEntitlementsMemory();
  const evening = new Date("2026-09-12T14:30:00.000Z");
  await consumeTurn("visitor-jst", evening);
  const nextMorning = new Date("2026-09-12T15:00:00.000Z");
  const rolled = await consumeTurn("visitor-jst", nextMorning);
  assert.equal(rolled.used, 1);
  assert.equal(rolled.day, "2026-09-13");
  await rm(dir, { recursive: true, force: true });
});

test("rewarded stub adds extra chats without signup", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-reward-"));
  process.env.USAGE_STORE_PATH = path.join(dir, "usage.json");
  process.env.ENTITLEMENTS_STORE_PATH = path.join(dir, "entitlements.json");
  delete process.env.TOUYA_DEBUG_UNLIMITED;
  delete process.env.TOUYA_PERSONAL;
  const { consumeTurn, grantReward, resetUsageMemory } = await import("./usage");
  const { resetEntitlementsMemory } = await import("./entitlements");
  resetUsageMemory();
  resetEntitlementsMemory();
  const now = new Date("2026-09-12T12:00:00.000Z");
  for (let i = 0; i < FREE_DAILY_TURNS; i += 1) {
    await consumeTurn("visitor-b", now);
  }
  const rewarded = await grantReward("visitor-b", now);
  assert.equal(rewarded.granted, true);
  assert.equal(rewarded.extra, REWARD_EXTRA_TURNS);
  assert.equal(rewarded.remaining, REWARD_EXTRA_TURNS);
  const extra = await consumeTurn("visitor-b", now);
  assert.equal(extra.allowed, true);
  await rm(dir, { recursive: true, force: true });
});

test("premium stub raises the daily cap", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-prem-"));
  process.env.USAGE_STORE_PATH = path.join(dir, "usage.json");
  process.env.ENTITLEMENTS_STORE_PATH = path.join(dir, "entitlements.json");
  delete process.env.TOUYA_DEBUG_UNLIMITED;
  delete process.env.TOUYA_PERSONAL;
  const { consumeTurn, resetUsageMemory } = await import("./usage");
  const { grantPremiumStub, resetEntitlementsMemory } = await import("./entitlements");
  resetUsageMemory();
  resetEntitlementsMemory();
  await grantPremiumStub("visitor-c");
  const now = new Date("2026-09-12T13:00:00.000Z");
  const first = await consumeTurn("visitor-c", now);
  assert.equal(first.premium, true);
  assert.equal(first.limit, PREMIUM_DAILY_TURNS);
  await rm(dir, { recursive: true, force: true });
});
