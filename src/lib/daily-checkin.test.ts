import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

test("check-in is a JST day flag with no currency", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-daily-"));
  process.env.DAILY_STORE_PATH = path.join(dir, "daily.json");
  const { emptyDailyCheckIn, resetDailyCheckInStore, touchDailyCheckIn } = await import("./daily-checkin");
  resetDailyCheckInStore();

  const late = new Date("2026-09-12T14:59:59.000Z");
  const next = new Date("2026-09-12T15:00:00.000Z");

  const first = await touchDailyCheckIn("visitor-a", late);
  assert.equal(first.date, "2026-09-12");
  assert.equal(first.checkedIn, true);
  assert.equal(first.firstToday, true);

  const again = await touchDailyCheckIn("visitor-a", late);
  assert.equal(again.firstToday, false);
  assert.equal(again.checkedIn, true);

  const rolled = await touchDailyCheckIn("visitor-a", next);
  assert.equal(rolled.date, "2026-09-13");
  assert.equal(rolled.firstToday, true);

  const anon = emptyDailyCheckIn(late);
  assert.equal(anon.checkedIn, false);
  assert.equal(anon.firstToday, false);

  await rm(dir, { recursive: true, force: true });
});
