import assert from "node:assert/strict";
import { test } from "node:test";
import { situationMediaPath, toPublicSituation, type CharacterSituation } from "./character-types";

const scene = (extra: Partial<CharacterSituation> = {}): CharacterSituation => ({
  id: "cafe-rain",
  title: "雨のカフェ",
  setting: "カフェ",
  look: "ニット。服や背景に文字を焼き込まない。",
  image: "/situations/hiyori/cafe-rain.png",
  ...extra,
});

test("situationMediaPath accepts optional non-empty paths", () => {
  assert.equal(situationMediaPath(undefined), null);
  assert.equal(situationMediaPath(null), null);
  assert.equal(situationMediaPath("  "), null);
  assert.equal(situationMediaPath(1), null);
  assert.equal(situationMediaPath("/situations/hiyori/cafe-rain.mp4"), "/situations/hiyori/cafe-rain.mp4");
});

test("toPublicSituation omits video unless set", () => {
  assert.equal("video" in toPublicSituation(scene()), false);
  assert.equal(
    toPublicSituation(scene({ video: " /situations/hiyori/cafe-rain.mp4 " })).video,
    "/situations/hiyori/cafe-rain.mp4",
  );
});
