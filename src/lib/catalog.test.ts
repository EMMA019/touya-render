import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCharacter } from "./catalog";
import type { Character } from "./character-types";

function base(): Character {
  return {
    id: "suzune",
    name: "鈴音",
    reading: "すずね",
    job: "司書",
    tagline: "夜の書庫で、静かに隣へ座る。",
    greeting: "…来たの。声は、小さくでいい。",
    welcomeBack: "おかえり。昨日と同じ席でいい？",
    farewell: "今日はここまでにしよう。また明日。",
    offline: "今ちょっと言葉が出ない。少し待って。",
    tone: "静か",
    artStyle: "anime",
    refusalStyle: "gentle",
    suggestions: ["今日は静かにしていたい"],
    palette: {
      from: "#1a1824",
      to: "#8a90b8",
      glow: "rgba(160, 170, 220, 0.35)",
      hair: "#2a2030",
      accent: "#d8d0e8",
    },
    situations: [
      {
        id: "stacks",
        title: "夜の書庫",
        setting: "閉館後の書庫。",
        look: "長袖のカーディガン。裾は膝下。肌は出さない。服や背景に文字を焼き込まない。",
        image: "/situations/suzune/stacks.png",
      },
    ],
    systemPrompt:
      "あなたは鈴音。フィクションの大人の女性。年齢の数字は言わない。設定や相手の事情を自分から並べない。",
    bible: {
      name: "鈴音",
      job: "司書",
      setting: "夜の書庫。",
      personality: ["静か"],
      never: ["年齢を数字で言う"],
    },
  };
}

test("catalog rejects ages, school framing, and missing look contract", () => {
  assert.deepEqual(validateCharacter(base(), "suzune.json"), []);

  const withAge = { ...base(), age: 24 } as Character & { age: number };
  assert.ok(validateCharacter(withAge, "suzune.json").some((issue) => issue.includes("年齢")));

  const teen = base();
  teen.systemPrompt = `${teen.systemPrompt} 私は20歳。`;
  assert.ok(validateCharacter(teen, "suzune.json").some((issue) => issue.includes("年齢")));

  const school = base();
  school.situations = [
    {
      ...school.situations[0],
      look: "学生服。服や背景に文字を焼き込まない。",
    },
  ];
  assert.ok(validateCharacter(school, "suzune.json").some((issue) => /学生服|JK/.test(issue)));

  const noLookRule = base();
  noLookRule.situations = [{ ...noLookRule.situations[0], look: "長袖のカーディガン。" }];
  assert.ok(validateCharacter(noLookRule, "suzune.json").some((issue) => issue.includes("文字を焼き込まない")));

  const wrongFile = base();
  assert.ok(validateCharacter(wrongFile, "other.json").some((issue) => issue.includes("ファイル名")));

  const badStyle = { ...base(), artStyle: "oil" as Character["artStyle"] };
  assert.ok(validateCharacter(badStyle, "suzune.json").some((issue) => issue.includes("artStyle")));

  const blankVideo = base();
  blankVideo.situations = [{ ...blankVideo.situations[0], video: "   " }];
  assert.ok(validateCharacter(blankVideo, "suzune.json").some((issue) => issue.includes("video")));

  const withVideo = base();
  withVideo.situations = [{ ...withVideo.situations[0], video: "/situations/suzune/stacks.mp4" }];
  assert.deepEqual(validateCharacter(withVideo, "suzune.json"), []);
});
