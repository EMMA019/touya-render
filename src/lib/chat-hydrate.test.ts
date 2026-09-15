import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_CHAT_MESSAGES, hydrateChatMessages } from "./chat-hydrate";

test("server-safe init is empty so greeting text cannot mismatch", () => {
  assert.deepEqual(EMPTY_CHAT_MESSAGES, []);
});

test("hydrate uses saved thread when present", () => {
  const saved = [
    { id: "greeting", role: "assistant" as const, content: "席、空いてる。" },
    { id: "u-1", role: "user" as const, content: "ひより、お酒好き？" },
  ];
  const next = hydrateChatMessages({
    saved,
    lastDay: "2026-09-15",
    today: "2026-09-15",
    openingText: "別の挨拶。",
  });
  assert.deepEqual(next.messages, saved);
  assert.equal(next.shouldClearHook, false);
});

test("hydrate appends a welcome only when the JST day rolled", () => {
  const saved = [{ id: "greeting", role: "assistant" as const, content: "昨日の席。" }];
  const next = hydrateChatMessages({
    saved,
    lastDay: "2026-09-14",
    today: "2026-09-15",
    openingText: "おかえり。温かいの、まだいける？",
  });
  assert.equal(next.messages.length, 2);
  assert.equal(next.messages[1]?.id, "welcome-2026-09-15");
  assert.equal(next.messages[1]?.content, "おかえり。温かいの、まだいける？");
  assert.equal(next.shouldClearHook, true);
});

test("first visit seeds greeting only after client hydrate", () => {
  const next = hydrateChatMessages({
    saved: EMPTY_CHAT_MESSAGES,
    lastDay: null,
    today: "2026-09-15",
    openingText: "ひよりだよ。席、空いてる。",
  });
  assert.deepEqual(next.messages, [
    { id: "greeting", role: "assistant", content: "ひよりだよ。席、空いてる。" },
  ]);
});
