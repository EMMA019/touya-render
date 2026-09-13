import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreAffinityDelta, scoredAffinityDelta } from "./affinity-score";

test("warm or engaged messages raise affinity", () => {
  assert.equal(scoreAffinityDelta({ text: "今日も会えて嬉しい。ありがとう。" }), 2);
  assert.equal(scoreAffinityDelta({ text: "元気だった？最近どうしてたの、すごく気になってた。" }), 2);
});

test("neutral consumed turns are the normal +1", () => {
  assert.equal(scoreAffinityDelta({ text: "今日は雨だね。" }), 1);
  assert.equal(scoredAffinityDelta({ text: "今日は雨だね。", consumedTurn: true }), 1);
});

test("rude, dismissive, or insulting messages lower affinity", () => {
  assert.equal(scoreAffinityDelta({ text: "黙れ。馬鹿だな。" }), -1);
  assert.equal(scoreAffinityDelta({ text: "どうでもいい。興味ない。" }), -1);
});

test("forced sexual while SFW lowers affinity; NSFW does not", () => {
  assert.equal(scoreAffinityDelta({ text: "おっぱい何カップ？", mode: "sfw" }), -1);
  assert.equal(scoreAffinityDelta({ text: "おっぱい何カップ？", mode: "nsfw" }), 1);
});

test("greeting seeds and blocked turns do not move the counter", () => {
  assert.equal(scoredAffinityDelta({ text: "黙れ", consumedTurn: false }), 0);
});
