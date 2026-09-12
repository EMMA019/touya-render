import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveChatBackend } from "./chat-backend";

test("sfw routes to DeepSeek when the key is present", () => {
  const resolved = resolveChatBackend({
    mode: "sfw",
    hasDeepseekKey: true,
    hasOpenRouterKey: false,
    demoEnabled: true,
  });
  assert.deepEqual(resolved, { ok: true, backend: "deepseek" });
});

test("sfw uses canned demo only when DeepSeek is missing", () => {
  const demo = resolveChatBackend({
    mode: "sfw",
    hasDeepseekKey: false,
    hasOpenRouterKey: true,
    demoEnabled: true,
  });
  assert.deepEqual(demo, { ok: true, backend: "demo" });

  const none = resolveChatBackend({
    mode: "sfw",
    hasDeepseekKey: false,
    hasOpenRouterKey: true,
    demoEnabled: false,
  });
  assert.deepEqual(none, { ok: false, error: "no_backend" });
});

test("nsfw routes to OpenRouter and never falls back to DeepSeek", () => {
  const live = resolveChatBackend({
    mode: "nsfw",
    hasDeepseekKey: true,
    hasOpenRouterKey: true,
    demoEnabled: true,
  });
  assert.deepEqual(live, { ok: true, backend: "openrouter" });

  const missing = resolveChatBackend({
    mode: "nsfw",
    hasDeepseekKey: true,
    hasOpenRouterKey: false,
    demoEnabled: true,
  });
  assert.deepEqual(missing, { ok: false, error: "openrouter_missing" });
});
