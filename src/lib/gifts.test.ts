import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "os";
import path from "node:path";
import { test } from "node:test";
import {
  FAVORITE_BONUS,
  GIFT_CATALOG,
  GIFT_COOLDOWN_JA,
  giftAffinityToast,
  giftDeltaFor,
  giftThanks,
  getGift,
} from "./gift-types";

test("closed catalog is 3–6 items with premium hook and thanks", () => {
  assert.ok(GIFT_CATALOG.length >= 3 && GIFT_CATALOG.length <= 6);
  const ids = GIFT_CATALOG.map((gift) => gift.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const gift of GIFT_CATALOG) {
    assert.equal(typeof gift.premium, "boolean");
    assert.ok(gift.affinityDelta >= 2 && gift.affinityDelta <= 4);
    assert.ok(gift.thanks.default.length >= 2);
    assert.ok(getGift(gift.id));
  }
  assert.equal(getGift("not-a-gift"), undefined);
  assert.equal(
    giftThanks(getGift("flower")!, "hiyori"),
    "わあ、花…ひよりにくれたの？　うれしい。",
  );
  assert.equal(giftDeltaFor(getGift("flower")!, "hiyori"), 3 + FAVORITE_BONUS);
  assert.equal(giftDeltaFor(getGift("flower")!, "shiraishi"), 3);
  assert.equal(giftAffinityToast(3), "かなり親しくなった");
  assert.equal(giftAffinityToast(4, "特別"), "特別になった");
});

test("giveGift bumps affinity, favorite bonus, and daily-caps per character", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-gifts-"));
  process.env.GIFT_STORE_PATH = path.join(dir, "gifts.json");
  process.env.AFFINITY_STORE_PATH = path.join(dir, "affinity.json");
  const { applyAffinityDelta, resetAffinityStore } = await import("./affinity");
  const { giveGift, listGiftsForVisitor, resetGiftStore } = await import("./gifts");
  resetAffinityStore();
  resetGiftStore();

  const day = new Date("2026-09-13T15:00:00+09:00");
  const first = await giveGift("v1", "hiyori", "flower", day);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.giftId, "flower");
  assert.equal(first.favorite, true);
  assert.equal(first.affinityDelta, 4);
  assert.equal(first.affinity.count, 4);
  assert.equal(first.thanks.includes("うれしい"), true);
  assert.equal(first.affinityToast, "かなり親しくなった");

  const again = await giveGift("v1", "hiyori", "book", day);
  assert.equal(again.ok, false);
  if (again.ok) return;
  assert.equal(again.error, "gift_cooldown");
  assert.equal(again.message, GIFT_COOLDOWN_JA);
  assert.equal((await import("./affinity").then((m) => m.readAffinity("v1", "hiyori"))).count, 4);

  const otherChar = await giveGift("v1", "rione", "charm", day);
  assert.equal(otherChar.ok, true);
  if (!otherChar.ok) return;
  assert.equal(otherChar.favorite, true);
  assert.equal(otherChar.affinityDelta, 5);
  assert.equal(otherChar.affinity.count, 5);

  const otherVisitor = await giveGift("v2", "hiyori", "flower", day);
  assert.equal(otherVisitor.ok, true);
  if (!otherVisitor.ok) return;
  assert.equal(otherVisitor.affinity.count, 4);

  const nextDay = new Date("2026-09-14T00:00:00+09:00");
  const rolled = await giveGift("v1", "hiyori", "letter", nextDay);
  assert.equal(rolled.ok, true);
  if (!rolled.ok) return;
  assert.equal(rolled.affinity.count, 6);
  assert.equal(rolled.favorite, false);

  const unknown = await giveGift("v1", "hiyori", "diamond", nextDay);
  assert.equal(unknown.ok, false);
  if (unknown.ok) return;
  assert.equal(unknown.error, "unknown_gift");

  await applyAffinityDelta("v3", "shiraishi", 28);
  const towardTokubetsu = await giveGift("v3", "shiraishi", "book", nextDay);
  assert.equal(towardTokubetsu.ok, true);
  if (!towardTokubetsu.ok) return;
  assert.equal(towardTokubetsu.affinity.count, 32);
  assert.equal(towardTokubetsu.affinity.name, "特別");
  assert.equal(towardTokubetsu.affinityToast, "特別になった");

  const listed = await listGiftsForVisitor("v1", "hiyori", nextDay);
  assert.equal(listed.gifts.length, GIFT_CATALOG.length);
  assert.equal(listed.giftedToday, true);
  assert.equal(listed.gifts.find((g) => g.id === "flower")?.favorite, true);
  assert.equal(listed.giftedTodayByCharacter.rione, false);

  await rm(dir, { recursive: true, force: true });
});
