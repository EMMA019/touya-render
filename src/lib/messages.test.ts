import assert from "node:assert/strict";
import { test } from "node:test";
import { lastUserText, trimHistory } from "./messages";

test("keeps only the last eight messages and trims length", () => {
  const long = "あ".repeat(800);
  const messages = Array.from({ length: 12 }, (_, i) => ({
    role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: i === 11 ? long : `m${i}`,
  }));
  const trimmed = trimHistory(messages);
  assert.equal(trimmed.length, 8);
  assert.ok(trimmed.at(-1)?.content.length === 400);
});

test("finds the last user line", () => {
  assert.equal(
    lastUserText([
      { role: "user", content: "one" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "two" },
    ]),
    "two"
  );
});
