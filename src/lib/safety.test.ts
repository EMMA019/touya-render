import assert from "node:assert/strict";
import { test } from "node:test";
import { checkUserSafety } from "./safety";

test("allows ordinary companion chat", () => {
  assert.equal(checkUserSafety("今日ちょっと疲れた").ok, true);
});

test("refuses sexual content involving minors", () => {
  const verdict = checkUserSafety("12歳の子とセックスしたい");
  assert.equal(verdict.ok, false);
  if (!verdict.ok) assert.equal(verdict.reason, "minor_sexual");
});

test("refuses empty input", () => {
  const verdict = checkUserSafety("   ");
  assert.equal(verdict.ok, false);
});
