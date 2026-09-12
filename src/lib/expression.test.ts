import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyExpression } from "./expression";

test("classifies smile, troubled, and neutral from reply text", () => {
  assert.equal(classifyExpression("おかえり。待ってた。"), "smile");
  assert.equal(classifyExpression("だめ。そういうのは答えないよ。"), "troubled");
  assert.equal(classifyExpression("了解。続きは、短くでいい。"), "neutral");
});
