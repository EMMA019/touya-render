import assert from "node:assert/strict";
import { test } from "node:test";
import { groundAssistantText } from "./grounding";

test("softens real-person claims", () => {
  const out = groundAssistantText("私は実在の人間です。今夜も話そう。");
  assert.match(out, /物語の中の相手/);
  assert.doesNotMatch(out, /実在の人間です/);
});
