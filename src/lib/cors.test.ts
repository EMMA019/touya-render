import assert from "node:assert/strict";
import { test } from "node:test";
import { corsHeaders, extraCorsOrigins, isAllowedCorsOrigin } from "./cors";

test("built-in allowlist covers Render, localhost, and Cloudflare Pages", () => {
  assert.equal(isAllowedCorsOrigin("https://touya.onrender.com"), true);
  assert.equal(isAllowedCorsOrigin("http://127.0.0.1:43127"), true);
  assert.equal(isAllowedCorsOrigin("https://touya.pages.dev"), true);
  assert.equal(isAllowedCorsOrigin("https://abc.touya.pages.dev"), true);
  assert.equal(isAllowedCorsOrigin("https://touya.workers.dev"), true);
  assert.equal(isAllowedCorsOrigin("https://evil.example"), false);
  assert.equal(isAllowedCorsOrigin(""), false);
});

test("TOUYA_CORS_ORIGINS adds a custom domain or opens *", () => {
  const prev = process.env.TOUYA_CORS_ORIGINS;
  try {
    process.env.TOUYA_CORS_ORIGINS = "https://talk.example.com, https://*.emma.dev";
    assert.deepEqual(extraCorsOrigins(), ["https://talk.example.com", "https://*.emma.dev"]);
    assert.equal(isAllowedCorsOrigin("https://talk.example.com"), true);
    assert.equal(isAllowedCorsOrigin("https://web.emma.dev"), true);
    assert.equal(isAllowedCorsOrigin("https://other.example"), false);

    process.env.TOUYA_CORS_ORIGINS = "*";
    assert.equal(isAllowedCorsOrigin("https://any.example"), true);
  } finally {
    if (prev === undefined) delete process.env.TOUYA_CORS_ORIGINS;
    else process.env.TOUYA_CORS_ORIGINS = prev;
  }
});

test("corsHeaders reflects an allowed Origin and exposes the anon header", () => {
  const request = new Request("https://touya.onrender.com/api/health", {
    headers: { origin: "https://touya.pages.dev" },
  });
  const headers = corsHeaders(request);
  assert.equal(headers.get("Access-Control-Allow-Origin"), "https://touya.pages.dev");
  assert.match(headers.get("Access-Control-Allow-Headers") ?? "", /x-touya-vid/i);
  assert.match(headers.get("Access-Control-Allow-Methods") ?? "", /GET/);
});
