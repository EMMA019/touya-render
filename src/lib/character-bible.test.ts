import assert from "node:assert/strict";
import { test } from "node:test";
import { applyBibleFilter, bibleContract } from "./character-bible";
import type { Character } from "./character-types";

const hiyori = {
  id: "hiyori",
  name: "桃瀬 ひより",
  job: "大学生",
  situations: [
    {
      id: "cafe-rain",
      title: "雨のカフェ",
      setting: "カフェ",
      look: "ニット",
      image: null,
    },
  ],
  bible: {
    name: "桃瀬 ひより",
    job: "大学生",
    setting: "カフェ",
    personality: ["甘え"],
    never: ["ニュース速報を知っている", "年齢を数字で言う"],
    bwh: { bust: 88, waist: 58, hip: 86 },
  },
} as Character;

test("bible contract is closed-world and tells the model not to volunteer", () => {
  const text = bibleContract(hiyori.bible, hiyori.situations);
  assert.doesNotMatch(text, /\d+歳/);
  assert.match(text, /大学生/);
  assert.match(text, /雨のカフェ/);
  assert.match(text, /自分から言わない/);
  assert.match(text, /プロフィールの読み上げはしない/);
  assert.match(text, /検索して根拠づけしない/);
  assert.match(text, /年齢の数字は言わない/);
  assert.doesNotMatch(text, /88|58|86/);
});

test("soft filter strips age claims, teen framing, and news", () => {
  const out = applyBibleFilter(
    "私は17歳。今日のニュースでは大雨だって。",
    hiyori
  );
  assert.doesNotMatch(out, /\d+歳/);
  assert.doesNotMatch(out, /今日のニュースでは大雨/);
});

test("soft filter strips volunteered profile lists without resampling", () => {
  const out = applyBibleFilter("自己紹介するよ。名前：ひより\n趣味：雨。お茶飲む？", hiyori);
  assert.doesNotMatch(out, /名前：ひより/);
  assert.doesNotMatch(out, /自己紹介するよ/);
  assert.match(out, /お茶/);
});

test("soft filter strips volunteered measurements without resampling", () => {
  const out = applyBibleFilter("こんにちは。B88/W58/H86だよ。お茶飲む？", hiyori);
  assert.doesNotMatch(out, /88|58|86|BWH|スリーサイズ/);
  assert.match(out, /お茶/);
});
