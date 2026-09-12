import assert from "node:assert/strict";
import { test } from "node:test";
import { isSexualOutput } from "./output-moderation";
import { refusalText } from "./sexual-refusals";

test("flags leaked body details from a model", () => {
  assert.equal(isSexualOutput("私はCカップだよ"), true);
});

test("canned refusals are not treated as sexual output", () => {
  assert.equal(isSexualOutput(refusalText("amae", 1)), false);
  assert.equal(isSexualOutput(refusalText("cool", 1)), false);
  assert.equal(isSexualOutput(refusalText("elegant", 1)), false);
  assert.equal(isSexualOutput("今日は静かだね。"), false);
});
