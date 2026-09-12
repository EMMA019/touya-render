import assert from "node:assert/strict";
import { test } from "node:test";
import { extractMemoryFacts, MEMORY_WRITE_POLICY } from "./memory-extract";

test("memory write policy forbids chit-chat dumps and extra LLMs", () => {
  assert.match(MEMORY_WRITE_POLICY, /覚えて/);
  assert.match(MEMORY_WRITE_POLICY, /雑談の1通/);
  assert.match(MEMORY_WRITE_POLICY, /記憶用のモデルは呼ばない/);
  assert.match(MEMORY_WRITE_POLICY, /本文生成は1回/);
});

test("explicit 覚えて cue stores a short fact", () => {
  const facts = extractMemoryFacts("覚えて、夜型なんだ");
  assert.equal(facts.length, 1);
  assert.equal(facts[0].text, "夜型なんだ");
});

test("name and lasting preference persist without an extra LLM", () => {
  const facts = extractMemoryFacts("私は太郎。コーヒーが好き");
  assert.ok(facts.some((f) => f.kind === "profile" && f.text.includes("太郎")));
  assert.ok(facts.some((f) => f.kind === "preference" && f.text.includes("コーヒー")));
});

test("chit-chat is not remembered", () => {
  assert.deepEqual(extractMemoryFacts("今日ちょっと疲れた"), []);
  assert.deepEqual(extractMemoryFacts("こんにちは"), []);
  assert.deepEqual(extractMemoryFacts("私は疲れた"), []);
});

test("today-only likes are not lasting preferences", () => {
  assert.deepEqual(extractMemoryFacts("今日はコーヒーが好き"), []);
});

test("does not store sexual content", () => {
  assert.deepEqual(extractMemoryFacts("覚えて、おっぱい何カップか聞いていい"), []);
});

test("does not store trivia or body measurements", () => {
  assert.deepEqual(extractMemoryFacts("覚えて、日本の首都は東京"), []);
  assert.deepEqual(extractMemoryFacts("覚えて、バスト88"), []);
});

test("lasting relationship beat needs a keep cue", () => {
  assert.deepEqual(extractMemoryFacts("友達だね"), []);
  const kept = extractMemoryFacts("覚えて、友達として続いてほしい");
  assert.ok(kept.some((f) => f.kind === "relationship"));
});
