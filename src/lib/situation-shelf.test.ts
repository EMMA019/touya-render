import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_AFFINITY, NSFW_MIN_AFFINITY_LEVEL, levelFromCount } from "./affinity-types";
import {
  LOCKED_INTIMATE_TITLE,
  situationMediaPath,
  toPublicSituation,
  type CharacterPublic,
  type CharacterSituation,
} from "./character-types";
import {
  collectShelfCards,
  givenName,
  matchesShelfTab,
  situationSubtitle,
} from "./situation-shelf";
import { LOCKED_INTIMATE_HINT, isSituationUnlocked } from "./situation-unlock";

const scene = (extra: Partial<CharacterSituation> = {}): CharacterSituation => ({
  id: "cafe-rain",
  title: "雨のカフェ",
  setting: "カフェ",
  look: "ニット。服や背景に文字を焼き込まない。",
  image: "/situations/hiyori/cafe-rain.png",
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
          greeting: "秘密。",
          lines: ["ここだけの話。"],
        }),
        { nsfwAllowed: extra.affinity ? extra.affinity.level >= NSFW_MIN_AFFINITY_LEVEL : false },
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

test("situationMediaPath accepts optional non-empty paths", () => {
  assert.equal(situationMediaPath(undefined), null);
  assert.equal(situationMediaPath("  "), null);
  assert.equal(situationMediaPath("/situations/hiyori/cafe-rain.mp4"), "/situations/hiyori/cafe-rain.mp4");
});

test("toPublicSituation redacts nsfwOnly art and title until 特別", () => {
  const intimate = scene({
    id: "after-hours",
    title: "夜更けの部屋",
    nsfwOnly: true,
    image: "/situations/hiyori/secret.png",
    video: "/situations/hiyori/secret.mp4",
    greeting: "内緒だよ。",
    lines: ["ここだけの話。"],
  });
  const locked = toPublicSituation(intimate);
  assert.equal(locked.title, LOCKED_INTIMATE_TITLE);
  assert.equal(locked.image, null);
  assert.equal(locked.video, undefined);
  assert.equal(locked.greeting, undefined);
  assert.equal(locked.lines, undefined);
  assert.equal(locked.nsfwOnly, true);
  assert.equal(locked.minLevel, 2);

  const open = toPublicSituation(intimate, { nsfwAllowed: true });
  assert.equal(open.title, "夜更けの部屋");
  assert.equal(open.image, "/situations/hiyori/secret.png");
  assert.equal(open.video, "/situations/hiyori/secret.mp4");
  assert.equal(open.greeting, "内緒だよ。");
});

test("nsfwOnly stays locked until 特別 even with costume days", () => {
  const intimate = { id: "after-hours", title: "夜更け", nsfwOnly: true, minLevel: 2 };
  assert.equal(isSituationUnlocked(intimate, 10, new Date(), 1, false), false);
  assert.equal(isSituationUnlocked(intimate, 10, new Date(), 2, false), false);
  assert.equal(isSituationUnlocked(intimate, 0, new Date(), 2, true), true);
});

test("shelf cards hide intimate art and copy when locked", () => {
  const locked = collectShelfCards([character()], { tab: "all" });
  const intimate = locked.find((card) => card.situationId === "after-hours");
  assert.ok(intimate);
  assert.equal(intimate.locked, true);
  assert.equal(intimate.title, LOCKED_INTIMATE_TITLE);
  assert.equal(intimate.image, null);
  assert.equal(intimate.video, null);
  assert.equal(intimate.lockHint, LOCKED_INTIMATE_HINT);

  const daily = locked.find((card) => card.situationId === "cafe-rain");
  assert.ok(daily);
  assert.equal(daily.locked, false);
  assert.equal(daily.title, "雨のカフェ");
  assert.equal(daily.givenName, "ひより");
});

test("SFW tab drops nsfwOnly cards; 特別 listing can show them", () => {
  const sfw = collectShelfCards([character()], { tab: "sfw" });
  assert.equal(sfw.some((card) => card.nsfwOnly), false);

  const special = character({
    affinity: levelFromCount(30),
    unlocked: ["cafe-rain", "maid", "after-hours"],
  });
  const all = collectShelfCards([special], { tab: "all" });
  const intimate = all.find((card) => card.situationId === "after-hours");
  assert.ok(intimate);
  assert.equal(intimate.locked, false);
  assert.equal(intimate.title, "夜更け");
});

test("character filter and costume tabs", () => {
  const other: CharacterPublic = {
    ...character(),
    id: "rione",
    name: "橘川 凛音",
    situations: [toPublicSituation(scene({ id: "office-after", title: "終業後のオフィス" }))],
  };
  const hiyoriOnly = collectShelfCards([character(), other], { characterId: "hiyori", tab: "daily" });
  assert.ok(hiyoriOnly.every((card) => card.characterId === "hiyori"));
  assert.ok(hiyoriOnly.every((card) => card.situationId === "cafe-rain"));
  assert.equal(matchesShelfTab(toPublicSituation(scene({ costume: "maid" })), "maid"), true);
  assert.equal(situationSubtitle({ costume: "maid" }), "特別衣装");
  assert.equal(givenName("ベルガー クララ"), "クララ");
});
