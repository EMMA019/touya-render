import assert from "node:assert/strict";
import { test } from "node:test";
import { apiBase, apiUrl, isCrossOriginApi } from "./api-base";

test("apiUrl is same-origin when NEXT_PUBLIC_API_BASE is empty", () => {
  const prev = process.env.NEXT_PUBLIC_API_BASE;
  try {
    delete process.env.NEXT_PUBLIC_API_BASE;
    assert.equal(apiBase(), "");
    assert.equal(apiUrl("/api/session"), "/api/session");
    assert.equal(apiUrl("api/mode"), "/api/mode");
    assert.equal(isCrossOriginApi(), false);
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_API_BASE;
    else process.env.NEXT_PUBLIC_API_BASE = prev;
  }
});

test("apiUrl prefixes the Render origin and strips a trailing slash", () => {
  const prev = process.env.NEXT_PUBLIC_API_BASE;
  try {
    process.env.NEXT_PUBLIC_API_BASE = "https://touya.onrender.com/";
    assert.equal(apiBase(), "https://touya.onrender.com");
    assert.equal(apiUrl("/api/chat"), "https://touya.onrender.com/api/chat");
    assert.equal(isCrossOriginApi(), true);
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_API_BASE;
    else process.env.NEXT_PUBLIC_API_BASE = prev;
  }
});
