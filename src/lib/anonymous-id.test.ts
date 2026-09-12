import assert from "node:assert/strict";
import { test } from "node:test";
import { hashAnonymousId, isInstallUuid } from "./anonymous-id";

const SAMPLE = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("install UUID is accepted and hashed, never stored raw", () => {
  assert.equal(isInstallUuid(SAMPLE), true);
  assert.equal(isInstallUuid("not-an-id"), false);
  const hashed = hashAnonymousId(SAMPLE);
  assert.equal(hashed, hashAnonymousId(SAMPLE));
  assert.notEqual(hashed, SAMPLE);
  assert.equal(hashed.length, 64);
  assert.doesNotMatch(hashed, /-/);
});
