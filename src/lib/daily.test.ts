import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_AFFINITY, levelFromCount } from "./affinity-types";
import {
  LOCKED_INTIMATE_TITLE,
  toPublicSituation,
  type CharacterPublic,
  type CharacterSituation,
} from "./character-types";
import {
  dailyBlurb,
  dailyHref,
  isDailyEligible,
  nextBandProgress,
  pickDailyFromRoster,
  untilNextLabel,
} from "./daily";

const scene = (extra: Partial<CharacterSituation> = {}): CharacterSituation => ({
  id: "cafe-rain",
  title: "雨のカフェ",
  setting: "カフェ",
  look: "ニット。服や背景に文字を焼き込まない。",
  image: "/situations/hiyori/cafe-rain.png",
  greeting: "席、空いてる。",
  ...extra,
});

function character(extra: Partial<CharacterPublic> = {}): CharacterPublic {
  return {
    id: "hiyori",
    name: "桃瀬 ひより",
    reading: "ももせ ひより",
    job: "大学生",
    tagline: "甘えていいよって言う人。",
    greeting: "席、空いてる。",
    welcomeBack: "おかえり。",
    farewell: "また明日。",
    offline: "少し待って。",
    tone: "甘え",
    artStyle: "anime",
    suggestions: ["雨の音"],
    situations: [
      toPublicSituation(scene()),
      toPublicSituation(scene({ id: "maid", title: "メイド", costume: "maid", minLevel: 1 })),
      toPublicSituation(
        scene({
          id: "after-hours",
          title: "夜更け",
          nsfwOnly: true,
          minLevel: 2,
          image: "/situations/hiyori/secret.png",
        }),
      ),
    ],
    palette: {
      from: "#4a1824",
      to: "#e08a78",
      glow: "rgba(240, 150, 140, 0.42)",
      hair: "#6a2c28",
      accent: "#f6c4b4",
    },
    affinity: EMPTY_AFFINITY,
    ...extra,
  };
}

function roster(): CharacterPublic[] {
  return [
    character(),
    character({
      id: "rione",
      name: "橘川 凛音",
      tagline: "仕事のあとは、少しだけ甘える。",
      situations: [
        toPublicSituation(scene({ id: "office-after", title: "終業後のオフィス", image: "/situations/rione/office.png" })),
        toPublicSituation(scene({ id: "maid", title: "メイド", costume: "maid", minLevel: 1 })),
      ],
    }),
    character({
      id: "clara",
      name: "クララ・ベルジュ",
      tagline: "夜のテラスで、ワインを。",
      situations: [
        toPublicSituation(scene({ id: "terrace-night", title: "夜のテラス", image: "/situations/clara/terrace.png" })),
      ],
    }),
  ];
}

const beforeRollover = new Date("2026-09-12T14:59:59.000Z"); // 23:59 JST Sep 12
const afterRollover = new Date("2026-09-12T15:00:00.000Z"); // 00:00 JST Sep 13
const morningSameDay = new Date("2026-09-12T01:00:00.000Z"); // 10:00 JST Sep 12

test("same visitor and JST day stay stable across hours", () => {
  const a = pickDailyFromRoster(roster(), "visitor-a", morningSameDay);
  const b = pickDailyFromRoster(roster(), "visitor-a", beforeRollover);
  assert.ok(a);
  assert.ok(b);
  assert.equal(a.date, "2026-09-12");
  assert.deepEqual(a, b);
});

test("JST midnight rollover changes the calendar date", () => {
  const late = pickDailyFromRoster(roster(), "visitor-a", beforeRollover);
  const next = pickDailyFromRoster(roster(), "visitor-a", afterRollover);
  assert.ok(late);
  assert.ok(next);
  assert.equal(late.date, "2026-09-12");
  assert.equal(next.date, "2026-09-13");
});

test("roster rotates across consecutive JST days", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 6; i += 1) {
    const now = new Date(Date.parse("2026-09-12T12:00:00+09:00") + i * 86_400_000);
    const pick = pickDailyFromRoster(roster(), "visitor-rotate", now);
    assert.ok(pick);
    seen.add(pick.characterId);
  }
  assert.ok(seen.size >= 2, "expected more than one featured character across a week");
});

test("different visitors can get different partners on the same day", () => {
  const picks = ["v1", "v2", "v3", "v4", "v5", "v6"].map((id) =>
    pickDailyFromRoster(roster(), id, morningSameDay),
  );
  const ids = new Set(picks.map((pick) => pick?.characterId));
  assert.ok(ids.size >= 2);
});

test("locked nsfwOnly is never featured even when listed", () => {
  const locked = character({
    unlocked: ["cafe-rain", "maid", "after-hours"],
    affinity: levelFromCount(5),
  });
  const pick = pickDailyFromRoster([locked], "visitor-nsfw", morningSameDay);
  assert.ok(pick);
  assert.notEqual(pick.situationId, "after-hours");
  assert.notEqual(pick.title, LOCKED_INTIMATE_TITLE);
  assert.equal(isDailyEligible(locked.situations.find((row) => row.id === "after-hours")!, locked), false);
});

test("unlocked nsfwOnly still stays off the daily banner", () => {
  const special = character({
    unlocked: ["cafe-rain", "maid", "after-hours"],
    affinity: levelFromCount(30),
    situations: [
      toPublicSituation(scene()),
      toPublicSituation(
        scene({
          id: "after-hours",
          title: "夜更け",
          nsfwOnly: true,
          minLevel: 2,
          image: "/situations/hiyori/secret.png",
        }),
        { nsfwAllowed: true },
      ),
    ],
  });
  for (let i = 0; i < 8; i += 1) {
    const now = new Date(Date.parse("2026-09-12T12:00:00+09:00") + i * 86_400_000);
    const pick = pickDailyFromRoster([special], "visitor-special", now);
    assert.ok(pick);
    assert.notEqual(pick.situationId, "after-hours");
  }
});

test("locked costumes are skipped until the visitor unlocks them", () => {
  const fresh = character({ unlocked: ["cafe-rain"], affinity: EMPTY_AFFINITY });
  const pick = pickDailyFromRoster([fresh], "visitor-lock", morningSameDay);
  assert.ok(pick);
  assert.equal(pick.situationId, "cafe-rain");
  assert.equal(isDailyEligible(fresh.situations.find((row) => row.id === "maid")!, fresh), false);
});

test("unlocked costume stubs stay off the daily banner", () => {
  const ready = character({
    unlocked: ["cafe-rain", "maid"],
    affinity: levelFromCount(12),
  });
  for (let i = 0; i < 8; i += 1) {
    const now = new Date(Date.parse("2026-09-12T12:00:00+09:00") + i * 86_400_000);
    const pick = pickDailyFromRoster([ready], "visitor-costume", now);
    assert.ok(pick);
    assert.notEqual(pick.situationId, "maid");
  }
  assert.equal(isDailyEligible(ready.situations.find((row) => row.id === "maid")!, ready), false);
});

test("until-next copy and chat href stay thin", () => {
  assert.equal(untilNextLabel(12, "特別"), "あと12で特別");
  assert.equal(untilNextLabel(0, "特別"), null);
  assert.equal(dailyHref({ characterId: "hiyori", situationId: "cafe-rain" }), "/c/hiyori?s=cafe-rain");
  assert.equal(nextBandProgress(levelFromCount(18))?.name, "特別");
  assert.equal(nextBandProgress(levelFromCount(18))?.remaining, 12);
  assert.equal(dailyBlurb("ひより", "雨のカフェ"), "ひよりが、雨のカフェで待っている。");
});
