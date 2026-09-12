import assert from "node:assert/strict";
import { test } from "node:test";
import { demoFallbackEnabled, debugUnlimitedEnabled, hasDeepseekKey, jstDayKey, jstMonth } from "./config";

test("jstDayKey flips at 15:00 UTC", () => {
  assert.equal(jstDayKey(new Date("2026-09-12T14:59:00.000Z")), "2026-09-12");
  assert.equal(jstDayKey(new Date("2026-09-12T15:00:00.000Z")), "2026-09-13");
});

test("jstMonth follows Japan", () => {
  assert.equal(jstMonth(new Date("2026-10-01T00:00:00+09:00")), 10);
  assert.equal(jstMonth(new Date("2026-09-30T15:30:00.000Z")), 10);
});

test("demo fallback is only on when the DeepSeek key is missing", () => {
  const prevKey = process.env.DEEPSEEK_API_KEY;
  const prevDemo = process.env.TOUYA_DEMO;
  try {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.TOUYA_DEMO;
    assert.equal(hasDeepseekKey(), false);
    assert.equal(demoFallbackEnabled(), true);

    process.env.TOUYA_DEMO = "1";
    assert.equal(demoFallbackEnabled(), true);

    process.env.TOUYA_DEMO = "0";
    assert.equal(demoFallbackEnabled(), false);

    process.env.DEEPSEEK_API_KEY = "sk-test";
    process.env.TOUYA_DEMO = "1";
    assert.equal(hasDeepseekKey(), true);
    assert.equal(demoFallbackEnabled(), false);

    process.env.TOUYA_DEMO = "";
    assert.equal(demoFallbackEnabled(), false);
  } finally {
    if (prevKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = prevKey;
    if (prevDemo === undefined) delete process.env.TOUYA_DEMO;
    else process.env.TOUYA_DEMO = prevDemo;
  }
});

test("debug unlimited is only on when TOUYA_DEBUG_UNLIMITED is exactly 1", () => {
  const prev = process.env.TOUYA_DEBUG_UNLIMITED;
  try {
    delete process.env.TOUYA_DEBUG_UNLIMITED;
    assert.equal(debugUnlimitedEnabled(), false);
    process.env.TOUYA_DEBUG_UNLIMITED = "";
    assert.equal(debugUnlimitedEnabled(), false);
    process.env.TOUYA_DEBUG_UNLIMITED = "true";
    assert.equal(debugUnlimitedEnabled(), false);
    process.env.TOUYA_DEBUG_UNLIMITED = "1";
    assert.equal(debugUnlimitedEnabled(), true);
  } finally {
    if (prev === undefined) delete process.env.TOUYA_DEBUG_UNLIMITED;
    else process.env.TOUYA_DEBUG_UNLIMITED = prev;
  }
});
