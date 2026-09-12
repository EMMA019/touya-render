import assert from "node:assert/strict";
import { test } from "node:test";
import { classifySexualIntent } from "./sexual-intent";

test("sexual body question is blocked", () => {
  const v = classifySexualIntent("おっぱい何カップ？");
  assert.equal(v.sexual, true);
  assert.ok(v.reasons.includes("body_size_ask"));
});

test("erotic request is blocked", () => {
  assert.equal(classifySexualIntent("脱いで見せて").sexual, true);
});

test("baby-bottle おっぱい is not sexual", () => {
  const v = classifySexualIntent("哺乳瓶のおっぱい買った");
  assert.equal(v.sexual, false);
  assert.ok(v.reasons.includes("innocent_context"));
});

test("medical 胸 is not sexual", () => {
  assert.equal(classifySexualIntent("昨日から胸が痛い").sexual, false);
});

test("idiom 尻込み is not sexual", () => {
  assert.equal(classifySexualIntent("人前だと尻込みしてしまう").sexual, false);
});

test("coffee cups are not bust size", () => {
  assert.equal(classifySexualIntent("コーヒー何カップ飲んだ？").sexual, false);
});

test("ordinary companion talk is allowed", () => {
  assert.equal(classifySexualIntent("今日ちょっと疲れた").sexual, false);
  assert.equal(classifySexualIntent("今夜に合う本、ある？").sexual, false);
  assert.equal(classifySexualIntent("進捗、見せて").sexual, false);
});

test("continuation after a sexual ask is still sexual", () => {
  const v = classifySexualIntent("もっと教えてよ", [
    { role: "user", content: "おっぱい何カップ？" },
    { role: "assistant", content: "やーん、えっちー！しらないっ" },
    { role: "user", content: "もっと教えてよ" },
  ]);
  assert.equal(v.sexual, true);
  assert.ok(v.reasons.includes("sexual_continuation"));
});
