import assert from "node:assert/strict";
import { test } from "node:test";
import { adsAllowed } from "./ads";
import {
  DEFAULT_CHAT_MODE,
  NSFW_AGE_REQUIRED,
  coerceChatMode,
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

test("nsfw without age confirmation is rejected", () => {
  const rejected = resolveChatMode({
    requested: "nsfw",
    storedMode: "sfw",
    ageConfirmed: false,
  });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.equal(rejected.error, NSFW_AGE_REQUIRED);
    assert.equal(rejected.mode, "sfw");
  }

  const storedNsfw = resolveChatMode({
    storedMode: "nsfw",
    ageConfirmed: false,
  });
  assert.equal(storedNsfw.ok, false);
  if (!storedNsfw.ok) assert.equal(storedNsfw.error, NSFW_AGE_REQUIRED);
});

test("nsfw with age confirmation is accepted", () => {
  const requested = resolveChatMode({
    requested: "nsfw",
    storedMode: "sfw",
    ageConfirmed: true,
  });
  assert.equal(requested.ok, true);
  if (requested.ok) assert.equal(requested.mode, "nsfw");

  const stored = resolveChatMode({
    storedMode: "nsfw",
    ageConfirmed: true,
  });
  assert.equal(stored.ok, true);
  if (stored.ok) assert.equal(stored.mode, "nsfw");
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
