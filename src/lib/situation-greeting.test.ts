import assert from "node:assert/strict";
import { test } from "node:test";
import { loadRoster } from "./catalog";
import { situationGreeting, toPublicSituation } from "./character-types";
import { seedSituationGreeting, situationCardLines } from "./situation-greeting";

test("public situations expose greeting and 2–3 lines without setting/look", () => {
  for (const character of loadRoster()) {
    for (const scene of character.situations) {
      assert.ok(scene.greeting && scene.greeting.length >= 2, `${character.id}/${scene.id}`);
      assert.ok(Array.isArray(scene.lines) && scene.lines.length >= 2 && scene.lines.length <= 3, scene.id);
      const pub = toPublicSituation(scene);
      assert.equal(pub.greeting, scene.greeting);
      assert.deepEqual(pub.lines, scene.lines);
      assert.equal("setting" in pub, false);
      assert.equal("look" in pub, false);
      assert.doesNotMatch(JSON.stringify(pub), /学生服|JK|下着見せ|パンツ|ランジェリー/);
    }
  }
});

test("situation greeting falls back to the character line", () => {
  assert.equal(situationGreeting({ greeting: " 傘、入れて。 " }, "fallback"), "傘、入れて。");
  assert.equal(situationGreeting({ greeting: "  " }, "席、空いてる。"), "席、空いてる。");
  assert.equal(situationGreeting(undefined, "席、空いてる。"), "席、空いてる。");
});

test("seeding a situation greeting does not need an API call", () => {
  const intro = [{ id: "greeting", role: "assistant", content: "ひよりだよ。" }];
  const switched = seedSituationGreeting(intro, "rainy-walk", "傘、入れて。");
  assert.deepEqual(switched, [{ id: "situation-rainy-walk", role: "assistant", content: "傘、入れて。" }]);

  const chatting = [
    { id: "greeting", role: "assistant", content: "ひよりだよ。" },
    { id: "u-1", role: "user", content: "疲れた" },
    { id: "a-1", role: "assistant", content: "うん。" },
  ];
  const appended = seedSituationGreeting(chatting, "miko", "灯籠、まだついてる。");
  assert.equal(appended.at(-1)?.id, "situation-miko");
  assert.equal(appended.length, 4);

  const retitled = seedSituationGreeting(appended, "maid", "おかえり。お茶、出すね。");
  assert.equal(retitled.at(-1)?.content, "おかえり。お茶、出すね。");
  assert.equal(retitled.length, 4);
});

test("situation card keeps two or three flavor lines", () => {
  assert.deepEqual(situationCardLines({ lines: ["雨の音、一緒に聴こう。", "席、あけておいた。", ""] }), [
    "雨の音、一緒に聴こう。",
    "席、あけておいた。",
  ]);
});

test("object lines below minLevel are hidden", () => {
  const scene = {
    lines: [
      "雨の音、一緒に聴こう。",
      { text: "席、あけておいた。" },
      { text: "もう少し話したら、続きを見せる。", minLevel: 2 },
    ],
  };
  assert.deepEqual(situationCardLines(scene, 0), ["雨の音、一緒に聴こう。", "席、あけておいた。"]);
  assert.deepEqual(situationCardLines(scene, 1), ["雨の音、一緒に聴こう。", "席、あけておいた。"]);
  assert.deepEqual(situationCardLines(scene, 2), [
    "雨の音、一緒に聴こう。",
    "席、あけておいた。",
    "もう少し話したら、続きを見せる。",
  ]);
});
