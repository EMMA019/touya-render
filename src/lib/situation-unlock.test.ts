import assert from "node:assert/strict";
import { test } from "node:test";
import { loadRoster } from "./catalog";
import { toPublicSituation } from "./character-types";
import {
  COSTUME_BAND,
  LOCKED_HINT,
  NSFW_MIN_AFFINITY_LEVEL,
  OPTIMISTIC_UNLOCK,
  isSituationUnlocked,
  requiredFlags,
  situationLockHint,
  situationLocks,
  situationRequiredLevel,
  unlockReason,
  unlockedSituationIds,
  type UnlockContext,
} from "./situation-unlock";
import type { StoryFlag } from "./story-types";

const daily = { id: "cafe-rain", title: "雨のカフェ", season: undefined, costume: undefined };
const maid = { id: "maid", title: "メイド", costume: "maid" };
const nurse = { id: "nurse", title: "ナース", costume: "nurse", minLevel: 1 };
const halloween = { id: "halloween", title: "ハロウィン", season: "halloween", costume: "halloween", minLevel: 1 };
const miko = { id: "miko", title: "巫女", costume: "miko" };
const idol = { id: "idol", title: "アイドル", costume: "idol", minLevel: 2 };
const lateNight = { id: "late-night", title: "夜更け", nsfwOnly: true, season: undefined, costume: undefined };
const bondNight = { id: "bond-night", title: "絆の夜", nsfwOnly: true, minLevel: 3, season: undefined, costume: undefined };

const october = new Date("2026-10-03T12:00:00+09:00");
const september = new Date("2026-09-12T12:00:00+09:00");

function ctx(level: -1 | 0 | 1 | 2 | 3, extra: Partial<UnlockContext> = {}): UnlockContext {
  const flags: StoryFlag[] = [];
  if (level >= 0) flags.push("B1");
  if (level >= 1) flags.push("B3");
  if (level >= 2) flags.push("B4");
  if (level >= 3) flags.push("B5");
  return { flags, effectiveLevel: level, pendingChapter: null, now: september, ...extra };
}

test("bands: daily=0, maid/nurse/halloween=1, miko/idol=2, nsfwOnly floors at 特別", () => {
  assert.equal(situationRequiredLevel(daily), 0);
  assert.equal(situationRequiredLevel(maid), 1);
  assert.equal(situationRequiredLevel(nurse), 1);
  assert.equal(situationRequiredLevel(halloween), 1);
  assert.equal(situationRequiredLevel(miko), 2);
  assert.equal(situationRequiredLevel(idol), 2);
  assert.equal(situationRequiredLevel(lateNight), NSFW_MIN_AFFINITY_LEVEL);
  assert.equal(situationRequiredLevel({ ...lateNight, minLevel: 0 }), NSFW_MIN_AFFINITY_LEVEL);
  assert.equal(situationRequiredLevel(bondNight), 3);
  assert.equal(NSFW_MIN_AFFINITY_LEVEL, 2);
  assert.deepEqual(COSTUME_BAND, { maid: 1, nurse: 1, halloween: 1, miko: 2, idol: 2 });
  assert.deepEqual(requiredFlags(daily), ["B1"]);
  assert.deepEqual(requiredFlags(maid), ["B1", "B3"]);
  assert.deepEqual(requiredFlags(miko), ["B1", "B4"]);
  assert.deepEqual(requiredFlags({ ...maid, requires: ["B2"] }), ["B1", "B3", "B2"]);
});

test("met days are gone: costumes open by effective band alone", () => {
  assert.equal(isSituationUnlocked(daily, ctx(0)), true);
  assert.equal(isSituationUnlocked(maid, ctx(0)), false);
  assert.equal(isSituationUnlocked(maid, ctx(1)), true);
  assert.equal(isSituationUnlocked(miko, ctx(1)), false);
  assert.equal(isSituationUnlocked(miko, ctx(2)), true);
  assert.deepEqual(unlockedSituationIds([daily, maid, miko], ctx(1)), ["cafe-rain", "maid"]);
  assert.deepEqual(unlockedSituationIds([daily, maid, miko], ctx(3)), ["cafe-rain", "maid", "miko"]);
});

test("nothing opens before Ch0 (B1); SSR fallback is the 知り合い band", () => {
  assert.equal(isSituationUnlocked(daily, ctx(-1)), false);
  assert.equal(unlockReason(daily, ctx(-1)), "band");
  assert.deepEqual(unlockedSituationIds([daily, maid], ctx(-1)), []);
  assert.deepEqual(unlockedSituationIds([daily, maid], { ...OPTIMISTIC_UNLOCK, now: september }), ["cafe-rain"]);
  // A raw band without the chapter flag is "flag" (count says yes, story says not yet).
  assert.equal(unlockReason(maid, { flags: ["B1"], effectiveLevel: 1, pendingChapter: null, now: september }), "flag");
});

test("chapter pending: the count reached the band but the story has not", () => {
  const pending = ctx(0, { pendingChapter: 1 });
  assert.equal(unlockReason(maid, pending), "chapter");
  assert.equal(situationLockHint(maid, pending), LOCKED_HINT.chapter);
  assert.equal(unlockReason(miko, pending), "band");
  assert.equal(situationLockHint(miko, pending), "特別になったら");
});

test("halloween: October only, and still the 仲良し band", () => {
  assert.equal(unlockReason(halloween, ctx(1)), "season");
  assert.equal(situationLockHint(halloween, ctx(1)), LOCKED_HINT.season);
  assert.equal(isSituationUnlocked(halloween, ctx(1, { now: october })), true);
  assert.equal(isSituationUnlocked(halloween, ctx(0, { now: october })), false);
  assert.equal(unlockReason(halloween, ctx(0, { now: october })), "band");
});

test("nsfwOnly needs 特別 or above and NSFW mode; SFW mode never opens it", () => {
  assert.equal(isSituationUnlocked(lateNight, ctx(3, { nsfwAllowed: false })), false);
  assert.equal(unlockReason(lateNight, ctx(3, { nsfwAllowed: false })), "mode");
  assert.equal(isSituationUnlocked(lateNight, ctx(1, { nsfwAllowed: true })), false);
  assert.equal(isSituationUnlocked(lateNight, ctx(2, { nsfwAllowed: true })), true);
  assert.equal(isSituationUnlocked(bondNight, ctx(2, { nsfwAllowed: true })), false);
  assert.equal(isSituationUnlocked(bondNight, ctx(3, { nsfwAllowed: true })), true);
  assert.equal(situationLockHint(lateNight, ctx(3, { nsfwAllowed: false })), LOCKED_HINT.mode);
});

test("lock hints name the band, never a number; locks map lists every closed scene", () => {
  assert.equal(situationLockHint(maid, ctx(0)), "仲良しになったら");
  assert.equal(situationLockHint(miko, ctx(1)), "特別になったら");
  assert.equal(situationLockHint(bondNight, ctx(2, { nsfwAllowed: true })), "絆になったら");
  assert.equal(situationLockHint(maid, ctx(1)), "");
  assert.doesNotMatch(situationLockHint(miko, ctx(0)), /\d/);
  assert.deepEqual(situationLocks([daily, maid, miko, halloween], ctx(1)), {
    miko: "band",
    halloween: "season",
  });
});

test("shipped JSON matches the band table (unlock table == code)", () => {
  for (const character of loadRoster()) {
    for (const scene of character.situations) {
      const pub = toPublicSituation(scene);
      // Outfit ids outside the table (knit-cafe, evening-dress, winter-parka, yukata-sfw) are 仲良し.
      const expected = scene.nsfwOnly
        ? Math.max(scene.minLevel ?? 0, NSFW_MIN_AFFINITY_LEVEL)
        : scene.costume
          ? COSTUME_BAND[scene.costume] ?? 1
          : 0;
      assert.equal(pub.minLevel, expected, `${character.id}/${scene.id}`);
      assert.equal(situationRequiredLevel(scene), expected, `${character.id}/${scene.id}`);
      if (scene.nsfwOnly) {
        assert.equal(pub.nsfwOnly, true, `${character.id}/${scene.id}`);
        assert.ok((pub.minLevel ?? 0) >= NSFW_MIN_AFFINITY_LEVEL, `${character.id}/${scene.id}`);
      } else {
        assert.equal("nsfwOnly" in pub, false, `${character.id}/${scene.id}`);
      }
    }
    // Every character keeps at least one daily scene that opens right after Ch0.
    assert.ok(unlockedSituationIds(character.situations, ctx(0)).length >= 1, character.id);
  }
});
