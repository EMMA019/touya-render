import assert from "node:assert/strict";
import { test } from "node:test";
import type { Character } from "./character-types";
import type { PromptStory } from "./story-types";
import {
  BAND_TONE,
  buildSystemPrompt,
  COMPANION_ADULT_OK,
  COMPANION_NOT_NSFW,
  NSFW_ANSWER_DIRECT,
  KNOW_DONT_VOLUNTEER,
  ONE_REPLY_CONTRACT,
} from "./prompt";

test("prompt injects a short memory summary once and forbids volunteering", () => {
  const character = {
    systemPrompt: "短い人格。",
    situations: [
      { id: "cafe-rain", title: "雨のカフェ", setting: "カフェ", look: "ニット", image: null },
    ],
    bible: {
      name: "桃瀬 ひより",
      job: "大学生",
      setting: "カフェ",
      personality: ["甘え"],
      never: ["速報"],
    },
  } as Character;
  const prompt = buildSystemPrompt(character, "プロフィール: 呼び名は太郎", undefined, "familiar");
  assert.match(prompt, /覚えていること/);
  assert.match(prompt, /太郎/);
  assert.match(prompt, /知っていても言わない/);
  assert.match(prompt, /復唱しない/);
  assert.equal(prompt.split("【覚えていること】").length, 2);
  assert.ok(prompt.includes(KNOW_DONT_VOLUNTEER));
  assert.ok(prompt.includes(ONE_REPLY_CONTRACT));
  assert.match(prompt, /プロフィールの読み上げ/);
  assert.match(prompt, /監督・再生成/);
  assert.match(prompt, /性的なロールプレイには乗らない/);
  assert.match(prompt, /顔なじみ/);
  assert.match(prompt, /会話の続き/);
});

test("situation line stays clothed and does not volunteer the scene", () => {
  const character = {
    systemPrompt: "短い人格。",
    situations: [
      { id: "cafe-rain", title: "雨のカフェ", setting: "カフェ", look: "ニット", image: null },
    ],
    bible: {
      name: "桃瀬 ひより",
      job: "大学生",
      setting: "カフェ",
      personality: ["甘え"],
      never: ["速報"],
    },
  } as Character;
  const prompt = buildSystemPrompt(character, "", {
    id: "halloween-witch",
    title: "ハロウィン",
    setting: "かぼちゃ灯りの小さなポーチ。",
    look: "小さな魔女帽と黒の長袖ドレス。",
    season: "halloween",
    image: null,
  });
  assert.match(prompt, /今の場面/);
  assert.match(prompt, /ハロウィン/);
  assert.match(prompt, /かぼちゃ灯りの小さなポーチ/);
  assert.match(prompt, /見た目/);
  assert.match(prompt, /小さな魔女帽/);
  assert.match(prompt, /服は着たまま/);
  assert.match(prompt, /今の場面の空気/);
  assert.match(prompt, /検索や別モデルは呼ばない/);
  assert.match(prompt, /名札や看板の文字は言わない/);
  assert.doesNotMatch(prompt, /パンツ|下着見せ/);
  assert.doesNotMatch(prompt, /文字を焼き込まない/);
});

test("prompt adds a tomorrow hook when remaining is low", () => {
  const character = {
    systemPrompt: "短い人格。",
    situations: [
      { id: "cafe-rain", title: "雨のカフェ", setting: "カフェ", look: "ニット", image: null },
    ],
    bible: {
      name: "桃瀬 ひより",
      job: "大学生",
      setting: "カフェ",
      personality: ["甘え"],
      never: ["速報"],
    },
  } as Character;
  const prompt = buildSystemPrompt(character, "", undefined, "regular", {
    remaining: 1,
    daysAway: 3,
    streak: 3,
    clock: {
      day: "2026-09-12",
      hour: 22,
      month: 9,
      weekday: "sat",
      part: "night",
    },
  });
  assert.match(prompt, /終わり際/);
  assert.match(prompt, /明日への短い引き/);
  assert.match(prompt, /3日ぶり/);
  assert.match(prompt, /土曜の夜/);
});

test("prompt injects affinity name only, not counts or history", () => {
  const character = {
    systemPrompt: "短い人格。",
    situations: [
      { id: "cafe-rain", title: "雨のカフェ", setting: "カフェ", look: "ニット", image: null },
    ],
    bible: {
      name: "桃瀬 ひより",
      job: "大学生",
      setting: "カフェ",
      personality: ["甘え"],
      never: ["速報"],
    },
  } as Character;
  const prompt = buildSystemPrompt(character, "", undefined, "familiar", {
    affinityName: "仲良し",
  });
  const affinityLine = prompt.split("\n").find((line) => line.startsWith("【親密度】"));
  assert.equal(affinityLine, "【親密度】仲良し。名前だけ持つ。数値や履歴は言わない。");
  assert.doesNotMatch(affinityLine ?? "", /\d/);
  assert.equal(prompt.split("【親密度】").length, 2);
});

test("story present: 【関係】 replaces 【距離】, carries metVia line and band tone, never a number", () => {
  const prompt = buildSystemPrompt(fixtureCharacter(), "", undefined, "familiar", {
    affinityName: "仲良し",
    story: {
      metVia: "care",
      metViaLine: "雨の日のカフェで、濡れた服を気遣ったのがきっかけで知り合った",
      effectiveLevel: 1,
      effectiveName: "仲良し",
      flags: ["B1", "B2", "B3"],
      revealed: ["milktea"],
      revealedLines: ["ミルクティーが好きだと話した"],
    },
  });
  const lines = prompt.split("\n");
  const relation = lines.find((line) => line.startsWith("【関係】")) ?? "";
  assert.doesNotMatch(prompt, /【距離】/);
  assert.match(relation, /出会いは雨の日のカフェで、濡れた服を気遣った/);
  assert.match(relation, /今は仲良し。/);
  assert.ok(relation.includes(BAND_TONE[1]));
  assert.match(relation, /呼び名を自然に使う/);
  assert.doesNotMatch(relation, /恋人/);
  assert.doesNotMatch(relation, /\d/);
  const revealed = lines.find((line) => line.startsWith("【すでに話したこと】")) ?? "";
  assert.match(revealed, /ミルクティーが好きだと話した/);
  assert.match(revealed, /改めて紹介しない/);
  // Order: 【親密度】 → 【関係】 → 【すでに話したこと】.
  const idx = (prefix: string) => lines.findIndex((line) => line.startsWith(prefix));
  assert.ok(idx("【親密度】") < idx("【関係】"));
  assert.ok(idx("【関係】") < idx("【すでに話したこと】"));
  assert.doesNotMatch(prompt, /【温度】|【いま】/);
});

test("band tone escalates: 知り合い polite → 特別 デレ → 絆 lovers; legacy hides the meeting", () => {
  const at = (level: 0 | 1 | 2 | 3, flags: PromptStory["flags"], metVia = "seat") =>
    buildSystemPrompt(fixtureCharacter(), "", undefined, "regular", {
      story: { metVia, metViaLine: metVia === "legacy" ? undefined : "静かな部屋で知り合った", effectiveLevel: level, effectiveName: ["知り合い", "仲良し", "特別", "絆"][level], flags, revealed: [] },
    });
  assert.match(at(0, ["B1"]), /口調は丁寧で、少し距離がある/);
  assert.match(at(1, ["B1", "B3"]), /口調は柔らかく/);
  assert.match(at(2, ["B1", "B3", "B4"]), /甘え・デレ・照れ/);
  assert.match(at(2, ["B1", "B3", "B4"]), /恋人。距離は近い。それでも自分から設定は並べない/);
  assert.match(at(3, ["B1", "B3", "B4", "B5"]), /長く一緒にいる恋人/);
  const legacy = at(2, ["B1", "B3", "B4"], "legacy");
  assert.match(legacy, /出会いの経緯には触れない/);
  assert.doesNotMatch(legacy, /出会いは/);
  for (const level of [0, 1, 2, 3] as const) {
    assert.match(at(level, ["B1", "B3", "B4", "B5"]), /並べない/);
  }
});

test("nsfw 【関係】 keeps the adult clause; 【温度】 only while cool/cold and not thawed; 【いま】 precedes 【今の場面】", () => {
  const story: PromptStory = { metVia: "seat", effectiveLevel: 2, effectiveName: "特別", flags: ["B1", "B3", "B4"], revealed: [] };
  const nsfw = buildSystemPrompt(fixtureCharacter(), "", undefined, "regular", { chatMode: "nsfw", story });
  assert.match(nsfw.split("\n").find((line) => line.startsWith("【関係】")) ?? "", /体型・性的な話題にはキャラの口調で乗ってよい/);
  assert.ok(nsfw.endsWith(NSFW_ANSWER_DIRECT));

  const cold = buildSystemPrompt(fixtureCharacter(), "", halloween, "regular", {
    story,
    warmth: { level: "cold", thawed: false },
    beatHint: "初対面。相手は席を尋ねてきた人。2文で。",
  });
  assert.match(cold, /【温度】久しぶり/);
  assert.match(cold, /自分から性的な話題や場面の誘いは出さない/);
  const coldLines = cold.split("\n");
  const idx = (prefix: string) => coldLines.findIndex((line) => line.startsWith(prefix));
  assert.ok(idx("【いま】") >= 0);
  assert.ok(idx("【いま】") < idx("【今の場面】"));
  assert.match(coldLines[idx("【いま】")] ?? "", /初対面。相手は席を尋ねてきた人/);

  const thawed = buildSystemPrompt(fixtureCharacter(), "", undefined, "regular", { story, warmth: { level: "cool", thawed: true } });
  assert.doesNotMatch(thawed, /【温度】/);
  const warm = buildSystemPrompt(fixtureCharacter(), "", undefined, "regular", { story, warmth: { level: "warm", thawed: false } });
  assert.doesNotMatch(warm, /【温度】/);
  const cool = buildSystemPrompt(fixtureCharacter(), "", undefined, "regular", { story, warmth: { level: "cool", thawed: false } });
  assert.match(cool, /【温度】少し間が空いた/);
  // The one-LLM operational rules are untouched by the story layer.
  assert.match(cold, /一回で返す/);
  assert.match(cold, /知っていても言わない/);
});

function fixtureCharacter(): Character {
  return {
    systemPrompt: "短い人格。",
    situations: [
      { id: "cafe-rain", title: "雨のカフェ", setting: "カフェ", look: "ニット", image: null },
    ],
    bible: {
      name: "桃瀬 ひより",
      job: "大学生",
      setting: "カフェ",
      personality: ["甘え"],
      never: ["速報"],
    },
  } as Character;
}

const halloween: Character["situations"][number] = {
  id: "halloween-witch",
  title: "ハロウィン",
  setting: "かぼちゃ灯りの小さなポーチ。",
  look: "小さな魔女帽と黒の長袖ドレス。",
  season: "halloween",
  image: null,
};

test("sfw prompt keeps companion-not-nsfw and clothed situation", () => {
  const sfw = buildSystemPrompt(fixtureCharacter(), "", halloween, "familiar", {
    chatMode: "sfw",
  });
  const omitted = buildSystemPrompt(fixtureCharacter(), "", halloween);
  for (const prompt of [sfw, omitted]) {
    assert.ok(prompt.includes(COMPANION_NOT_NSFW));
    assert.match(prompt, /性的なロールプレイには乗らない/);
    assert.doesNotMatch(prompt, /合意のあるおとなの性的な会話/);
    assert.ok(!prompt.includes(COMPANION_ADULT_OK));
    assert.match(prompt, /服は着たまま/);
    assert.match(prompt, /下着や肌の強調はしない/);
    assert.match(prompt, /知っていても言わない/);
    assert.match(prompt, /一回で返す/);
  }
});

test("nsfw prompt uses adult-allowed companion rules and relaxes clothing", () => {
  const prompt = buildSystemPrompt(fixtureCharacter(), "", halloween, "familiar", {
    chatMode: "nsfw",
  });
  assert.ok(prompt.includes(COMPANION_ADULT_OK));
  assert.match(prompt, /合意のあるおとなの性的な会話/);
  assert.match(prompt, /説教・道徳の講義はしない/);
  assert.match(prompt, /話題そらしはしない/);
  assert.ok(prompt.includes(NSFW_ANSWER_DIRECT));
  assert.ok(prompt.endsWith(NSFW_ANSWER_DIRECT));
  assert.match(prompt, /親密度や距離が低くても/);
  assert.match(prompt, /仕事・オフィス/);
  assert.match(prompt, /未成年/);
  assert.match(prompt, /女子高生/);
  assert.match(prompt, /実在の児童ポルノは扱わない/);
  assert.ok(!prompt.includes(COMPANION_NOT_NSFW));
  assert.doesNotMatch(prompt, /性的なロールプレイには乗らない/);
  assert.doesNotMatch(prompt, /服は着たまま/);
  assert.doesNotMatch(prompt, /下着や肌の強調はしない/);
  assert.match(prompt, /今の場面/);
  assert.match(prompt, /名札や看板の文字は言わない/);
  assert.match(prompt, /知っていても言わない/);
  assert.match(prompt, /一回で返す/);
  assert.match(prompt, /会話の続き/);
});
