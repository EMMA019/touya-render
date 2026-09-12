import assert from "node:assert/strict";
import { test } from "node:test";
import { daysUntilUnlock, isSituationUnlocked, unlockedSituationIds } from "./situation-unlock";

const daily = { id: "cafe-rain", title: "雨のカフェ", season: undefined, costume: undefined };
const maid = { id: "maid", title: "メイド", costume: "maid" as const };
const halloween = { id: "halloween", title: "ハロウィン", season: "halloween", costume: "halloween" as const };

test("daily scenes start unlocked; costumes wait for return visits", () => {
  assert.equal(isSituationUnlocked(daily, 1), true);
  assert.equal(isSituationUnlocked(maid, 1), false);
  assert.equal(isSituationUnlocked(maid, 3), true);
});

test("halloween opens in October even on the first visit", () => {
  const october = new Date("2026-10-03T12:00:00+09:00");
  assert.equal(isSituationUnlocked(halloween, 1, october), true);
  const september = new Date("2026-09-12T12:00:00+09:00");
  assert.equal(isSituationUnlocked(halloween, 1, september), false);
  assert.deepEqual(unlockedSituationIds([daily, maid, halloween], 1, september), ["cafe-rain"]);
  assert.equal(daysUntilUnlock(maid, 1, september), 2);
  assert.equal(daysUntilUnlock(maid, 2, september), 1);
  assert.equal(daysUntilUnlock(daily, 1, september), null);
});

test("minLevel gates costumes even when days or halloween season would open them", () => {
  const september = new Date("2026-09-12T12:00:00+09:00");
  const october = new Date("2026-10-03T12:00:00+09:00");
  const maidLv1 = { ...maid, minLevel: 1 };
  const halloweenLv1 = { ...halloween, minLevel: 1 };
  assert.equal(isSituationUnlocked(daily, 3, september, 0), true);
  assert.equal(isSituationUnlocked(maidLv1, 3, september, 0), false);
  assert.equal(isSituationUnlocked(maidLv1, 3, september, 1), true);
  assert.equal(isSituationUnlocked(halloweenLv1, 1, october, 0), false);
  assert.equal(isSituationUnlocked(halloweenLv1, 1, october, 1), true);
  assert.equal(daysUntilUnlock(maidLv1, 3, september, 0), null);
  assert.equal(daysUntilUnlock(maidLv1, 1, september, 1), 2);
});
