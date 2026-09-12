import assert from "node:assert/strict";
import { test } from "node:test";
import { adsAllowed } from "./ads";

test("adsAllowed is false in nsfw even when the env flag is on", () => {
  assert.equal(adsAllowed("nsfw", true), false);
  assert.equal(adsAllowed("nsfw", false), false);
});

test("adsAllowed follows the env flag in sfw", () => {
  assert.equal(adsAllowed("sfw", true), true);
  assert.equal(adsAllowed("sfw", false), false);
});
