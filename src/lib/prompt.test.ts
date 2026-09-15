import assert from "node:assert/strict";
import { test } from "node:test";
import type { Character } from "./character-types";
import {
  buildSystemPrompt,
  COMPANION_ADULT_OK,
  COMPANION_NOT_NSFW,
  NSFW_ANSWER_DIRECT,
  KNOW_DONT_VOLUNTEER,
  ONE_REPLY_CONTRACT,
} from "./prompt";
import { AFFINITY_STAGE_PACKS, REPLY_LENGTH } from "./reply-style";

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

test("prompt injects a short memory summary once and forbids volunteering", () => {
  const prompt = buildSystemPrompt(fixtureCharacter(), "プロフィール: 呼び名は太郎", undefined, "familiar");
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
  const prompt = buildSystemPrompt(fixtureCharacter(), "", halloween);
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
  const prompt = buildSystemPrompt(fixtureCharacter(), "", undefined, "regular", {
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
  const prompt = buildSystemPrompt(fixtureCharacter(), "", undefined, "familiar", {
    affinityName: "仲良し",
  });
  const affinityLine = prompt.split("\n").find((line) => line.startsWith("【親密度】"));
  assert.match(affinityLine ?? "", /^【親密度】仲良し。/);
  assert.doesNotMatch(affinityLine ?? "", /\d/);
  assert.equal(prompt.split("【親密度】").length, 2);
  assert.match(affinityLine ?? "", /気軽で温かい/);
  assert.doesNotMatch(prompt, /【距離】/);
});

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

test("Gemma stack uses labeled sections, one length rule, and no telegram cap", () => {
  const prompt = buildSystemPrompt(fixtureCharacter(), "呼び名は太郎", undefined, "familiar", {
    affinityName: "知り合い",
    chatMode: "sfw",
  });
  assert.match(prompt, /^【役割】/);
  assert.match(prompt, /【世界】/);
  assert.match(prompt, /【約束】/);
  assert.match(prompt, /【話し方】/);
  assert.ok(prompt.includes(REPLY_LENGTH));
  assert.match(prompt, /3〜6文/);
  assert.doesNotMatch(prompt, /2〜4文/);
  assert.doesNotMatch(prompt, /日本語で短く話す/);
  assert.equal(prompt.split("【話し方】").length, 2);
  assert.doesNotMatch(prompt, /【距離】/);
});

test("SFW replies prefer statements over question-mark interview loops", () => {
  const prompt = buildSystemPrompt(fixtureCharacter(), "", undefined, "first", {
    affinityName: "知り合い",
    chatMode: "sfw",
  });
  assert.match(prompt, /疑問符で毎回終わらせない/);
  assert.match(prompt, /3回に1回以下/);
  assert.match(prompt, /次はどんな/);
  assert.match(prompt, /司会進行は禁止/);
  assert.match(prompt, /直前の話題の拍に留まる/);
  assert.match(prompt, /静かに閉じてよい/);
  assert.doesNotMatch(prompt, /問うことが多い/);
  assert.doesNotMatch(prompt, /質問は任意で、自然なときだけ一つ/);
  assert.doesNotMatch(prompt, /好奇心で話す/);
});

test("知り合い keeps emotional distance without a corporate register", () => {
  const prompt = buildSystemPrompt(fixtureCharacter(), "", undefined, "first", {
    affinityName: "知り合い",
  });
  const pack = AFFINITY_STAGE_PACKS.知り合い.sfw;
  assert.ok(prompt.includes(pack));
  assert.match(prompt, /まだ恋人ではない/);
  assert.doesNotMatch(prompt, /丁寧で距離を置く/);
  assert.match(prompt, /事務的・敬語過多・無味な返事にはしない/);
  assert.match(prompt, /キャラの地の声/);
  assert.match(prompt, /聞き返さなくてよい/);
  assert.match(prompt, /余白で静かに閉じてよい/);
});
