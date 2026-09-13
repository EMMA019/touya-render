import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchTtsConfigured } from "./tts-client";

test("fetchTtsConfigured is true only when GET /api/tts says configured", async () => {
  const prev = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ configured: true }), { status: 200 })) as typeof fetch;
    assert.equal(await fetchTtsConfigured(), true);

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ configured: false }), { status: 200 })) as typeof fetch;
    assert.equal(await fetchTtsConfigured(), false);

    globalThis.fetch = (async () => new Response("nope", { status: 503 })) as typeof fetch;
    assert.equal(await fetchTtsConfigured(), false);

    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    assert.equal(await fetchTtsConfigured(), false);
  } finally {
    globalThis.fetch = prev;
  }
});
