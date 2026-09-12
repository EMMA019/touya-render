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

test("screenshot: wine preference question is not a nickname or preference fact", () => {
  assert.deepEqual(extractMemoryFacts("僕はどんなワイン好き？"), []);
  assert.deepEqual(extractMemoryFacts("僕はどんなワインが好き？"), []);
  assert.deepEqual(extractMemoryFacts("どんなワインが好き"), []);
  assert.deepEqual(extractMemoryFacts("どんなワインが好き？"), []);
  assert.deepEqual(extractMemoryFacts("僕はどんなワイン好き"), []);
});

test("does not store interrogatives or meta-asks as 呼び名", () => {
  assert.deepEqual(extractMemoryFacts("僕の名前は何？"), []);
  assert.deepEqual(extractMemoryFacts("なんて呼んでほしいと思う？"), []);
  assert.deepEqual(extractMemoryFacts("呼び名はどんなワイン好き"), []);
});

test("nickname only from a clear call-me or name statement", () => {
  const callMe = extractMemoryFacts("直って呼んで");
  assert.equal(callMe.length, 1);
  assert.equal(callMe[0].kind, "profile");
  assert.equal(callMe[0].text, "呼び名は直");

  const named = extractMemoryFacts("僕の名前は太郎");
  assert.ok(named.some((f) => f.kind === "profile" && f.text === "呼び名は太郎"));
});

test("preference stores the value, not the question phrasing", () => {
  const liked = extractMemoryFacts("深い熟成のワインが好き");
  assert.deepEqual(liked, [{ kind: "preference", text: "深い熟成のワインが好き" }]);
  assert.deepEqual(extractMemoryFacts("どんなワインが好き"), []);
  assert.deepEqual(extractMemoryFacts("ワインはどんなのが好き？"), []);
});

test("save-cue still drops a question payload", () => {
  assert.deepEqual(extractMemoryFacts("覚えて、僕はどんなワイン好き？"), []);
  assert.deepEqual(extractMemoryFacts("覚えて、どんなワインが好き"), []);
});
