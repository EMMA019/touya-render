import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_OPENROUTER_NSFW_MODEL, openRouterBaseUrl, openRouterNsfwModel } from "./config";
import { streamOpenRouter } from "./openrouter";

test("OpenRouter defaults to the documented Hermes catalog id", () => {
  const prevModel = process.env.OPENROUTER_NSFW_MODEL;
  const prevBase = process.env.OPENROUTER_BASE_URL;
  try {
    delete process.env.OPENROUTER_NSFW_MODEL;
    delete process.env.OPENROUTER_BASE_URL;
    assert.equal(openRouterNsfwModel(), DEFAULT_OPENROUTER_NSFW_MODEL);
    assert.equal(openRouterBaseUrl(), "https://openrouter.ai/api/v1");

    process.env.OPENROUTER_NSFW_MODEL = "sao10k/l3-lunaris-8b";
    process.env.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/";
    assert.equal(openRouterNsfwModel(), "sao10k/l3-lunaris-8b");
    assert.equal(openRouterBaseUrl(), "https://openrouter.ai/api/v1");
  } finally {
    if (prevModel === undefined) delete process.env.OPENROUTER_NSFW_MODEL;
    else process.env.OPENROUTER_NSFW_MODEL = prevModel;
    if (prevBase === undefined) delete process.env.OPENROUTER_BASE_URL;
    else process.env.OPENROUTER_BASE_URL = prevBase;
  }
});

test("streamOpenRouter posts to OpenRouter chat completions", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  const prevFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "or-test";
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return new Response("data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\n\n", {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  }) as typeof fetch;

  try {
    const stream = await streamOpenRouter({
      systemPrompt: "sys",
      messages: [{ role: "user", content: "hello" }],
    });
    assert.ok(stream);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(calls[0].body.model, DEFAULT_OPENROUTER_NSFW_MODEL);
    assert.equal(calls[0].body.stream, true);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevKey;
  }
});
