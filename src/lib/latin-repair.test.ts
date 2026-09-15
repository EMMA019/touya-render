import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hasLatinSlip,
  latinAllowFor,
  latinSlips,
  repairAssistantLatin,
  scrubLatin,
} from "./latin-repair";

test("detects English token slips and mixed JP+Latin", () => {
  assert.deepEqual(latinSlips("ほうじ茶の liability だよ。"), ["liability"]);
  assert.deepEqual(latinSlips("ひyorum、待ってた。"), ["ひyorum"]);
  assert.equal(hasLatinSlip("うん、その感じ、わかる。温かいの、一緒に置いとく。"), false);
  assert.equal(hasLatinSlip("あはは www"), false);
});

test("Clara may keep a single French cue", () => {
  const allow = latinAllowFor({ id: "clara" });
  assert.equal(hasLatinSlip("Oui… 今日の風は、少し冷たいわね。", allow), false);
  assert.equal(hasLatinSlip("Bonsoir. テラスへ来て。", allow), false);
  assert.equal(hasLatinSlip("Oui… liability は言わないわ。", allow), true);
  assert.equal(hasLatinSlip("Oui… 今日の風は、少し冷たいわね。", latinAllowFor({ id: "hiyori" })), true);
});

test("scrub strips Latin leftovers without emptying Japanese", () => {
  const out = scrubLatin("ほうじ茶の liability だよ。隣、空いてる。");
  assert.doesNotMatch(out, /liability/);
  assert.match(out, /ほうじ茶/);
  assert.match(out, /隣/);
  const mixed = scrubLatin("ひyorum、待ってた。");
  assert.doesNotMatch(mixed, /[A-Za-z]/);
  assert.match(mixed, /待ってた/);
});

test("repair prefers one-shot regen then scrubs if Latin remains", async () => {
  const regenerated = await repairAssistantLatin({
    text: "ほうじ茶の liability だよ。",
    regenerate: async () => "ほうじ茶、あるよ。飲む？",
  });
  assert.equal(regenerated.repaired, true);
  assert.equal(regenerated.regenerated, true);
  assert.equal(regenerated.text, "ほうじ茶、あるよ。飲む？");

  const stillLatin = await repairAssistantLatin({
    text: "ほうじ茶の liability だよ。",
    regenerate: async () => "ほうじ茶の liability まだ。隣いて。",
  });
  assert.equal(stillLatin.regenerated, true);
  assert.doesNotMatch(stillLatin.text, /liability/);
  assert.match(stillLatin.text, /ほうじ茶/);

  const failed = await repairAssistantLatin({
    text: "ほうじ茶の liability だよ。",
    regenerate: async () => {
      throw new Error("upstream");
    },
  });
  assert.equal(failed.regenerated, false);
  assert.doesNotMatch(failed.text, /liability/);
});
