import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMPOSER_MAX_PX,
  COMPOSER_MIN_PX,
  composerHeightPx,
  isMobileChatInput,
  shouldSendOnEnter,
} from "./chat-composer";

test("composer height stays between 28 and 160", () => {
  assert.equal(COMPOSER_MIN_PX, 28);
  assert.equal(COMPOSER_MAX_PX, 160);
  assert.equal(composerHeightPx(10), 28);
  assert.equal(composerHeightPx(80), 80);
  assert.equal(composerHeightPx(240), 160);
});

test("mobile and coarse pointers never send on Enter", () => {
  assert.equal(isMobileChatInput({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }), true);
  assert.equal(isMobileChatInput({ userAgent: "Mozilla/5.0", pointerCoarse: true, innerWidth: 1200 }), true);
  assert.equal(isMobileChatInput({ userAgent: "Mozilla/5.0", pointerCoarse: false, innerWidth: 768 }), true);
  assert.equal(isMobileChatInput({ userAgent: "Mozilla/5.0", pointerCoarse: false, innerWidth: 1280 }), false);

  const enter = { key: "Enter", shiftKey: false, mobile: true };
  assert.equal(shouldSendOnEnter(enter), false);
  assert.equal(shouldSendOnEnter({ ...enter, mobile: false }), true);
});

test("IME composition and keyCode 229 never send", () => {
  const desktopEnter = { key: "Enter", shiftKey: false, mobile: false };
  assert.equal(shouldSendOnEnter({ ...desktopEnter, isComposing: true }), false);
  assert.equal(shouldSendOnEnter({ ...desktopEnter, keyCode: 229 }), false);
  assert.equal(shouldSendOnEnter({ ...desktopEnter, shiftKey: true }), false);
  assert.equal(shouldSendOnEnter({ key: "a", shiftKey: false, mobile: false }), false);
});
