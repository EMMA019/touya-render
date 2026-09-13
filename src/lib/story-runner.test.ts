import assert from "node:assert/strict";
import { test } from "node:test";
import {
  appendUnique,
  choiceBubble,
  composerHidden,
  findBeatPublic,
  findChapterPublic,
  storyBeatBubbles,
  stripOpening,
} from "./story-runner";
import { readStoryScriptFile, toPublicScript } from "./story-script";

const script = toPublicScript(readStoryScriptFile("hiyori.json"));
const chapter = findChapterPublic(script, "hiyori-ch0")!;

test("beat bubbles: narration caption first, one bubble per text, deterministic ids", () => {
  const b0 = findBeatPublic(script, "hiyori-ch0", "b0")!;
  const bubbles = storyBeatBubbles(chapter.id, b0);
  assert.equal(bubbles.length, 2);
  assert.equal(bubbles[0].id, "story-hiyori-ch0-b0-n");
  assert.equal(bubbles[0].narration, true);
  assert.equal(bubbles[1].id, "story-hiyori-ch0-b0-0");
  assert.equal(bubbles[1].role, "assistant");
  assert.match(bubbles[1].content, /降ってきたね/);
  const twoLine = storyBeatBubbles("x", { id: "b", kind: "line", text: ["一。", "二。"], next: "c" });
  assert.deepEqual(twoLine.map((b) => b.id), ["story-x-b-0", "story-x-b-1"]);
});

test("appendUnique never double-posts a resumed beat; stripOpening removes only greeting/welcome", () => {
  const b1 = findBeatPublic(script, "hiyori-ch0", "b1")!;
  const bubbles = storyBeatBubbles(chapter.id, b1);
  const base = [
    { id: "greeting", role: "assistant" as const, content: "挨拶" },
    { id: "welcome-2026-09-12", role: "assistant" as const, content: "おかえり" },
    { id: "u-1", role: "user" as const, content: "こんばんは" },
  ];
  const once = appendUnique(base, bubbles);
  const twice = appendUnique(once, bubbles);
  assert.equal(twice, once);
  assert.equal(once.length, base.length + bubbles.length);
  const stripped = stripOpening(once);
  assert.deepEqual(stripped.map((m) => m.id).slice(0, 2), ["u-1", "story-hiyori-ch0-b1-0"]);
  assert.equal(stripOpening(stripped), stripped);
});

test("choice bubble uses userText, falls back to label; composer hides for non-free beats", () => {
  const b1 = findBeatPublic(script, "hiyori-ch0", "b1")!;
  const care = b1.choices!.find((c) => c.id === "c-care")!;
  const bubble = choiceBubble(chapter.id, b1.id, care);
  assert.equal(bubble.id, "choice-hiyori-ch0-b1");
  assert.equal(bubble.role, "user");
  assert.equal(bubble.content, "服が少し濡れてるけど、隣大丈夫？");
  assert.equal(choiceBubble("c", "b", { label: "ラベル" }).content, "ラベル");
  assert.equal(composerHidden(null), false);
  assert.equal(composerHidden(b1), true);
  assert.equal(composerHidden({ id: "f", kind: "free", text: ["？"], next: "e" }), false);
  assert.equal(composerHidden(findBeatPublic(script, "hiyori-ch0", "end-a")), true);
  assert.equal(findBeatPublic(script, "hiyori-ch0", "nope"), null);
  assert.equal(findBeatPublic(script, "nope", "b0"), null);
});
