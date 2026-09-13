import assert from "node:assert/strict";
import { test } from "node:test";
import { adsAllowed } from "./ads";
import {
  DEFAULT_CHAT_MODE,
  NSFW_AFFINITY_REQUIRED,
  NSFW_AGE_REQUIRED,
  NSFW_MIN_AFFINITY_LEVEL,
  canAccessNsfw,
  coerceChatMode,
  effectiveChatMode,
  parseChatMode,
  resolveChatMode,
  toModePublic,
} from "./chat-mode";

test("default mode is SFW", () => {
  assert.equal(DEFAULT_CHAT_MODE, "sfw");
  assert.equal(coerceChatMode(undefined), "sfw");
  assert.equal(coerceChatMode("nope"), "sfw");
  assert.equal(parseChatMode("nsfw"), "nsfw");
  assert.equal(parseChatMode("SFW"), null);
});

test("canAccessNsfw needs age and 特別 — debug unlimited is irrelevant", () => {
  const prev = process.env.TOUYA_DEBUG_UNLIMITED;
  process.env.TOUYA_DEBUG_UNLIMITED = "1";
  try {
    assert.equal(NSFW_MIN_AFFINITY_LEVEL, 2);
    assert.equal(canAccessNsfw({ affinityLevel: 0, ageConfirmed: true }), false);
    assert.equal(canAccessNsfw({ affinityLevel: 1, ageConfirmed: true }), false);
    assert.equal(canAccessNsfw({ affinityLevel: 2, ageConfirmed: false }), false);
    assert.equal(canAccessNsfw({ affinityLevel: 2, ageConfirmed: true }), true);
    assert.equal(canAccessNsfw({ affinityLevel: 3, ageConfirmed: true }), true);
    assert.equal(canAccessNsfw({ ageConfirmed: true }), false);
  } finally {
    if (prev === undefined) delete process.env.TOUYA_DEBUG_UNLIMITED;
    else process.env.TOUYA_DEBUG_UNLIMITED = prev;
  }
});

test("level 0–1 cannot enable NSFW even with age", () => {
  for (const level of [0, 1]) {
    const rejected = resolveChatMode({
      requested: "nsfw",
      storedMode: "sfw",
      ageConfirmed: true,
      affinityLevel: level,
    });
    assert.equal(rejected.ok, false);
    if (!rejected.ok) {
      assert.equal(rejected.error, NSFW_AFFINITY_REQUIRED);
      assert.equal(rejected.mode, "sfw");
    }
  }
});

test("nsfw without age confirmation is rejected", () => {
  const rejected = resolveChatMode({
    requested: "nsfw",
    storedMode: "sfw",
    ageConfirmed: false,
    affinityLevel: 3,
  });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.equal(rejected.error, NSFW_AGE_REQUIRED);
    assert.equal(rejected.mode, "sfw");
  }

  const storedNsfw = resolveChatMode({
    storedMode: "nsfw",
    ageConfirmed: false,
    affinityLevel: 3,
  });
  assert.equal(storedNsfw.ok, true);
  if (storedNsfw.ok) assert.equal(storedNsfw.mode, "sfw");
});

test("level 2+ can enable NSFW with age", () => {
  const requested = resolveChatMode({
    requested: "nsfw",
    storedMode: "sfw",
    ageConfirmed: true,
    affinityLevel: 2,
  });
  assert.equal(requested.ok, true);
  if (requested.ok) assert.equal(requested.mode, "nsfw");

  const stored = resolveChatMode({
    storedMode: "nsfw",
    ageConfirmed: true,
    affinityLevel: 2,
  });
  assert.equal(stored.ok, true);
  if (stored.ok) assert.equal(stored.mode, "nsfw");
});

test("stored nsfw falls back to SFW for a character still below 特別", () => {
  const stored = resolveChatMode({
    storedMode: "nsfw",
    ageConfirmed: true,
    affinityLevel: 0,
  });
  assert.equal(stored.ok, true);
  if (stored.ok) assert.equal(stored.mode, "sfw");
  assert.equal(effectiveChatMode("nsfw", true, 1), "sfw");
  assert.equal(effectiveChatMode("nsfw", true, 2), "nsfw");
});

test("sfw stays available with or without age confirmation", () => {
  const noAge = resolveChatMode({
    requested: "sfw",
    storedMode: "nsfw",
    ageConfirmed: false,
  });
  assert.equal(noAge.ok, true);
  if (noAge.ok) assert.equal(noAge.mode, "sfw");

  const withAge = resolveChatMode({
    requested: "sfw",
    storedMode: "nsfw",
    ageConfirmed: true,
    affinityLevel: 2,
  });
  assert.equal(withAge.ok, true);
  if (withAge.ok) assert.equal(withAge.mode, "sfw");
});

test("ads flag is false when nsfw and true in sfw when env allows", () => {
  assert.equal(adsAllowed("nsfw", true), false);
  assert.equal(adsAllowed("nsfw", false), false);
  assert.equal(adsAllowed("sfw", true), true);
  assert.equal(adsAllowed("sfw", false), false);

  const nsfw = toModePublic({
    chatMode: "nsfw",
    ageConfirmed: true,
    ageConfirmedAt: "2026-09-12T00:00:00.000Z",
    adsEnabled: true,
    affinityLevel: 2,
  });
  assert.equal(nsfw.adsEnabled, false);
  assert.equal(nsfw.chatMode, "nsfw");

  const sfw = toModePublic({
    chatMode: "sfw",
    ageConfirmed: false,
    ageConfirmedAt: null,
    adsEnabled: true,
  });
  assert.equal(sfw.adsEnabled, true);
  assert.equal(sfw.chatMode, "sfw");
});
