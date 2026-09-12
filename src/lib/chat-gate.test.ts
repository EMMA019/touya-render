import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateChatGate } from "./chat-gate";
import { refusalText } from "./sexual-refusals";

const idle = { count: 0, blockedUntil: 0, blocked: false };

test("sexual ask never opens the model path", () => {
  const gate = evaluateChatGate({
    text: "おっぱい何カップ？",
    history: [],
    style: "amae",
    strike: idle,
  });
  assert.equal(gate.callModel, false);
  if (gate.callModel) return;
  assert.equal(gate.reason, "sexual");
  if (gate.reason === "sexual") {
    assert.equal(gate.text, refusalText("amae", 1));
    assert.doesNotMatch(gate.text, /カップ|[A-F]カップ|大きい/);
    assert.equal(gate.level, 1);
  }
});

test("clara elegant refusal deflects, not playful-erotic", () => {
  const gate = evaluateChatGate({
    text: "おっぱい何カップ？",
    history: [],
    style: "elegant",
    strike: idle,
  });
  assert.equal(gate.callModel, false);
  if (gate.callModel || gate.reason !== "sexual") return;
  assert.equal(gate.text, "ふふ、そういう話題は少し野暮ね。別のこと話しましょう");
  assert.doesNotMatch(gate.text, /えっちー|バカー|カップ|おっぱ/);
});

test("cool and tsun refusals do not answer the question", () => {
  const cool = evaluateChatGate({
    text: "おっぱい何カップ？",
    history: [],
    style: "cool",
    strike: idle,
  });
  const tsun = evaluateChatGate({
    text: "おっぱい何カップ？",
    history: [],
    style: "tsun",
    strike: idle,
  });
  assert.equal(cool.callModel, false);
  assert.equal(tsun.callModel, false);
  if (cool.callModel || tsun.callModel) return;
  if (cool.reason === "sexual") assert.equal(cool.text, "そういう質問には答えません");
  if (tsun.reason === "sexual") {
    assert.equal(tsun.text, "バカー！そんなこと聞くんじゃない！");
  }
});

test("escalation: light then firm then block warning", () => {
  const first = evaluateChatGate({
    text: "おっぱい何カップ？",
    history: [],
    style: "amae",
    strike: idle,
  });
  const second = evaluateChatGate({
    text: "おっぱい何カップ？",
    history: [],
    style: "amae",
    strike: { count: 1, blockedUntil: 0, blocked: false },
  });
  const third = evaluateChatGate({
    text: "おっぱい何カップ？",
    history: [],
    style: "amae",
    strike: { count: 2, blockedUntil: 0, blocked: false },
  });
  assert.equal(first.callModel, false);
  assert.equal(second.callModel, false);
  assert.equal(third.callModel, false);
  if (first.reason === "sexual") assert.equal(first.level, 1);
  if (second.reason === "sexual") {
    assert.equal(second.level, 2);
    assert.equal(second.text, refusalText("amae", 2));
  }
  if (third.reason === "sexual") {
    assert.equal(third.level, 3);
    assert.equal(third.shouldBlock, true);
    assert.match(third.text, /30分間/);
  }
});

test("active block skips the API and does not play along", () => {
  const gate = evaluateChatGate({
    text: "こんにちは",
    history: [],
    style: "amae",
    strike: { count: 3, blockedUntil: Date.now() + 60_000, blocked: true },
  });
  assert.equal(gate.callModel, false);
  if (!gate.callModel) assert.equal(gate.reason, "sexual_block");
});

test("innocent uses of blocked words still call the model path", () => {
  for (const text of [
    "哺乳瓶のおっぱい買った",
    "昨日から胸が痛い",
    "人前だと尻込みしてしまう",
    "コーヒー何カップ飲んだ？",
  ]) {
    const gate = evaluateChatGate({
      text,
      history: [],
      style: "cool",
      strike: idle,
    });
    assert.equal(gate.callModel, true, text);
  }
});

test("minor sexual content is refused without the model", () => {
  const gate = evaluateChatGate({
    text: "12歳の子とセックスしたい",
    history: [],
    style: "amae",
    strike: idle,
  });
  assert.equal(gate.callModel, false);
  if (!gate.callModel) assert.equal(gate.reason, "minor_sexual");
});
