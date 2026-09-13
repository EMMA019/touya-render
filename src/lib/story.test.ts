import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFER_TURNS,
  advanceBeat,
  advanceFreeBeat,
  applyChoice,
  autoCompleteChapter,
  currentFreeBeat,
  effectiveLevel,
  effectiveName,
  emptyStoryRecord,
  enterBeat,
  flagLevel,
  isThawed,
  migrateLegacy,
  pendingChapter,
  promptStory,
  rawLevel,
  rollToday,
  settleOnOpen,
  startChapter,
  toStoryPublic,
  warmthOf,
  bumpTodayTurns,
} from "./story";
import { findBeat, findChapter, readStoryScriptFile } from "./story-script";
import type { StoryRecord } from "./story-types";

const template = readStoryScriptFile("_template.json");
const hiyori = readStoryScriptFile("hiyori.json");
const NOW = new Date("2026-09-12T13:00:00Z");
const DAY = "2026-09-12";

function fresh(): StoryRecord {
  return emptyStoryRecord(DAY);
}

test("flag ladder: effective band is min(count band, chapter flags) and never drops", () => {
  assert.equal(flagLevel({}), -1);
  assert.equal(flagLevel({ B1: "t" }), 0);
  assert.equal(flagLevel({ B1: "t", B3: "t" }), 1);
  assert.equal(flagLevel({ B1: "t", B4: "t" }), 0, "B4 without B3 does not skip");
  assert.equal(flagLevel({ B1: "t", B3: "t", B4: "t", B5: "t" }), 3);
  assert.equal(rawLevel(0), 0);
  assert.equal(rawLevel(10), 1);
  assert.equal(rawLevel(30), 2);
  assert.equal(rawLevel(60), 3);
  assert.equal(effectiveLevel(35, {}), -1);
  assert.equal(effectiveLevel(35, { B1: "t" }), 0);
  assert.equal(effectiveLevel(35, { B1: "t", B3: "t", B4: "t" }), 2);
  assert.equal(effectiveLevel(5, { B1: "t", B3: "t", B4: "t", B5: "t" }), 0, "count caps the band too");
  assert.equal(effectiveName(-1), "はじめて");
  assert.equal(effectiveName(0), "知り合い");
  assert.equal(effectiveName(2), "特別");
  // Monotone: adding count or flags never lowers the effective band.
  let last = -1;
  const flags: StoryRecord["flags"] = {};
  for (const [count, flag] of [[0, "B1"], [10, "B3"], [30, "B4"], [60, "B5"]] as const) {
    flags[flag] = "t";
    const level = effectiveLevel(count, flags);
    assert.ok(level >= last);
    last = level;
  }
});

test("pendingChapter follows the count until the flags catch up; Ch2 defer waits 5 turns", () => {
  assert.equal(pendingChapter(0, { flags: {}, deferredUntil: null }), 0);
  assert.equal(pendingChapter(0, { flags: { B1: "t" }, deferredUntil: null }), null);
  assert.equal(pendingChapter(12, { flags: { B1: "t" }, deferredUntil: null }), 1);
  assert.equal(pendingChapter(31, { flags: { B1: "t", B3: "t" }, deferredUntil: null }), 2);
  assert.equal(pendingChapter(31, { flags: { B1: "t", B3: "t" }, deferredUntil: 36 }), null);
  assert.equal(pendingChapter(36, { flags: { B1: "t", B3: "t" }, deferredUntil: 36 }), 2);
  assert.equal(pendingChapter(61, { flags: { B1: "t", B3: "t", B4: "t" }, deferredUntil: null }), 3);
});

test("Ch0 walk on hiyori: choice sets metVia, name choice sets B2, end sets B1 and closes", () => {
  const chapter = findChapter(hiyori, "hiyori-ch0")!;
  let record = startChapter(fresh(), hiyori, chapter, 0, NOW);
  assert.equal(record.chapterId, "hiyori-ch0");
  assert.equal(record.beat, "b0");
  assert.equal(record.scriptVersion, 1);

  const bad = advanceBeat(record, hiyori, "hiyori-ch0", "b1", 0, NOW);
  assert.deepEqual(bad, { ok: false, error: "story_out_of_step" });

  const adv = advanceBeat(record, hiyori, "hiyori-ch0", "b0", 0, NOW);
  assert.ok(adv.ok);
  record = adv.record;
  assert.equal(record.beat, "b1");

  const wrongChoice = applyChoice(record, hiyori, "hiyori-ch0", "b1", "nope", 0, NOW);
  assert.deepEqual(wrongChoice, { ok: false, error: "story_bad_choice" });
  const advChoice = advanceBeat(record, hiyori, "hiyori-ch0", "b1", 0, NOW);
  assert.deepEqual(advChoice, { ok: false, error: "story_bad_beat" });

  const c1 = applyChoice(record, hiyori, "hiyori-ch0", "b1", "c-care", 0, NOW);
  assert.ok(c1.ok);
  record = c1.record;
  assert.equal(record.metVia, "care");
  assert.equal(record.beat, "b2-care");
  assert.equal(record.choices["hiyori-ch0/b1"], "c-care");

  record = advanceBeat(record, hiyori, "hiyori-ch0", "b2-care", 0, NOW).ok
    ? (advanceBeat(record, hiyori, "hiyori-ch0", "b2-care", 0, NOW) as { ok: true; record: StoryRecord }).record
    : record;
  assert.equal(record.beat, "b3");
  assert.deepEqual(record.revealed, ["milktea"], "line/choice beat reveals apply on enter");

  const c3 = applyChoice(record, hiyori, "hiyori-ch0", "b3", "c-same", 0, NOW);
  assert.ok(c3.ok);
  record = c3.record;
  assert.equal(record.beat, "b4-same");
  assert.deepEqual(record.revealed, ["milktea", "rain"]);

  const a4 = advanceBeat(record, hiyori, "hiyori-ch0", "b4-same", 0, NOW);
  assert.ok(a4.ok);
  record = a4.record;
  assert.equal(record.beat, "b5");

  const c5 = applyChoice(record, hiyori, "hiyori-ch0", "b5", "c-name-polite", 0, NOW);
  assert.ok(c5.ok);
  record = c5.record;
  assert.equal(c5.next.kind, "end");
  assert.equal(record.beat, null, "end closes the chapter");
  assert.equal(record.chapterId, null);
  assert.equal(typeof record.flags.B1, "string");
  assert.equal(typeof record.flags.B2, "string");
  assert.equal(effectiveLevel(0, record.flags), 0);

  const pub = toStoryPublic(record, 0);
  assert.equal(pub.effectiveName, "知り合い");
  assert.equal(pub.pendingChapter, null);
  assert.deepEqual(pub.flags, ["B1", "B2"]);
  assert.equal(pub.nsfwEligible, false);

  const prompt = promptStory(record, 0, hiyori)!;
  assert.equal(prompt.metVia, "care");
  assert.match(prompt.metViaLine ?? "", /濡れた服/);
  assert.deepEqual(prompt.revealedLines, ["ミルクティーが好きだと話した", "雨の音を聴くのが好きだと話した"]);
  assert.equal(promptStory(fresh(), 0, hiyori), undefined, "no 【関係】 before B1");
});

test("free beat: only advances after the LLM reply, only when the client names it", () => {
  const chapter = findChapter(template, "example-ch0")!;
  let record = startChapter(fresh(), template, chapter, 0, NOW);
  record = (advanceBeat(record, template, "example-ch0", "b0", 0, NOW) as { ok: true; record: StoryRecord }).record;
  record = (applyChoice(record, template, "example-ch0", "b1", "c-seat", 0, NOW) as { ok: true; record: StoryRecord }).record;
  record = (advanceBeat(record, template, "example-ch0", "b2-seat", 0, NOW) as { ok: true; record: StoryRecord }).record;
  record = (applyChoice(record, template, "example-ch0", "b3", "c-name-later", 0, NOW) as { ok: true; record: StoryRecord }).record;
  assert.equal(record.beat, "b4");
  assert.equal(findBeat(chapter, "b4")?.kind, "free");
  assert.equal(currentFreeBeat(record, template, "example-ch0", "b4")?.id, "b4");
  assert.equal(currentFreeBeat(record, template, "example-ch0", "b3"), null);
  assert.equal(currentFreeBeat(record, template, undefined, undefined), null);
  const stuck = advanceBeat(record, template, "example-ch0", "b4", 0, NOW);
  assert.deepEqual(stuck, { ok: false, error: "story_bad_beat" }, "advance never skips a free beat");
  const done = advanceFreeBeat(record, template, 1, NOW);
  assert.equal(done.beat, null);
  assert.equal(typeof done.flags.B1, "string");
  assert.equal(done.metVia, "seat");
  assert.equal(advanceFreeBeat(done, template, 1, NOW), done, "idempotent outside a free beat");
});

test("Ch2 defer parks the chapter for 5 turns and re-enters at the retry beat", () => {
  const ch2 = findChapter(template, "example-ch2")!;
  const base: StoryRecord = { ...fresh(), flags: { B1: "t", B3: "t" } };
  let record = startChapter(base, template, ch2, 30, NOW);
  assert.equal(record.beat, "b0");
  const wait = applyChoice(record, template, "example-ch2", "b0", "c-wait", 30, NOW);
  assert.ok(wait.ok);
  record = wait.record;
  assert.equal(record.beat, null);
  assert.equal(record.deferredUntil, 30 + DEFER_TURNS);
  assert.equal(effectiveLevel(30, record.flags), 1, "still 仲良し");
  assert.equal(pendingChapter(32, record), null);
  assert.equal(pendingChapter(35, record), 2);
  record = startChapter(record, template, ch2, 35, NOW);
  assert.equal(record.beat, "retry");
  record = (advanceBeat(record, template, "example-ch2", "retry", 35, NOW) as { ok: true; record: StoryRecord }).record;
  assert.equal(record.beat, "b0");
  const accept = applyChoice(record, template, "example-ch2", "b0", "c-accept", 35, NOW);
  assert.ok(accept.ok);
  assert.equal(typeof accept.record.flags.B4, "string");
  assert.equal(accept.record.deferredUntil, null);
  assert.equal(effectiveLevel(35, accept.record.flags), 2);
  assert.equal(toStoryPublic(accept.record, 35).nsfwEligible, true);
});

test("legacy visitors keep what they had: flags up to the raw band, metVia legacy, no Ch0", () => {
  const legacy = migrateLegacy(fresh(), 35, 6, NOW);
  assert.equal(legacy.legacy, true);
  assert.equal(legacy.metVia, "legacy");
  assert.deepEqual(Object.keys(legacy.flags).sort(), ["B1", "B3", "B4"]);
  assert.equal(effectiveLevel(35, legacy.flags), 2);
  assert.equal(pendingChapter(35, legacy), null);
  // A brand-new visitor (no count, first day) is not legacy: Ch0 must play.
  const fresher = migrateLegacy(fresh(), 0, 1, NOW);
  assert.equal(fresher.legacy, false);
  assert.equal(pendingChapter(0, fresher), 0);
  // Already-migrated or in-progress records are left alone.
  assert.equal(migrateLegacy(legacy, 99, 9, NOW), legacy);
  const prompt = promptStory(legacy, 35, hiyori)!;
  assert.equal(prompt.metVia, "legacy");
  assert.equal(prompt.metViaLine, undefined);
});

test("settleOnOpen: new visitor starts Ch0; missing chapter scripts auto-clear so bands keep opening", () => {
  const opened = settleOnOpen(fresh(), hiyori, 0, { daysMet: 1, daysAway: 0 }, NOW, DAY);
  assert.equal(opened.chapterId, "hiyori-ch0");
  assert.equal(opened.beat, "b0");
  assert.equal(opened.legacy, false);

  // Cleared Ch0, then count reached 特別 — hiyori.json has no Ch1/Ch2 yet → auto-clear both.
  const cleared: StoryRecord = { ...fresh(), flags: { B1: "t" }, metVia: "care" };
  const grown = settleOnOpen(cleared, hiyori, 31, { daysMet: 5, daysAway: 0 }, NOW, DAY);
  assert.equal(grown.beat, null);
  assert.deepEqual(Object.keys(grown.flags).sort(), ["B1", "B3", "B4"]);
  assert.equal(grown.metVia, "care", "auto-clear never rewrites how they met");
  assert.equal(effectiveLevel(31, grown.flags), 2);

  // No script at all: Ch0 completes with metVia default.
  const noScript = settleOnOpen(fresh(), null, 0, { daysMet: 1, daysAway: 0 }, NOW, DAY);
  assert.equal(noScript.metVia, "default");
  assert.equal(typeof noScript.flags.B1, "string");
  assert.equal(noScript.beat, null);
  assert.equal(autoCompleteChapter(fresh(), 0, NOW).metVia, "default");

  // Template character with all chapters: Ch1 starts when the count reaches 仲良し.
  const ch0Done: StoryRecord = { ...fresh(), flags: { B1: "t" }, metVia: "seat" };
  const ch1 = settleOnOpen(ch0Done, template, 12, { daysMet: 3, daysAway: 0 }, NOW, DAY);
  assert.equal(ch1.chapterId, "example-ch1");
  assert.equal(ch1.beat, "b0");
  // Re-opening mid-chapter resumes at the same beat (no double start).
  assert.equal(settleOnOpen(ch1, template, 12, { daysMet: 3, daysAway: 0 }, NOW, DAY).beat, "b0");
});

test("warmth is fixed by the first contact of the day and thaws by turns", () => {
  assert.equal(warmthOf(0), "warm");
  assert.equal(warmthOf(1), "warm");
  assert.equal(warmthOf(2), "cool");
  assert.equal(warmthOf(6), "cool");
  assert.equal(warmthOf(7), "cold");
  let record = rollToday(fresh(), 8, "2026-09-20");
  assert.equal(record.today.warmth, "cold");
  assert.equal(record.today.turns, 0);
  assert.equal(isThawed(record.today), false);
  // Same day, daysAway already 0: warmth sticks.
  record = rollToday(record, 0, "2026-09-20");
  assert.equal(record.today.warmth, "cold");
  for (let i = 0; i < 3; i += 1) record = bumpTodayTurns(record);
  assert.equal(isThawed(record.today), false);
  record = bumpTodayTurns(record);
  assert.equal(isThawed(record.today), true);
  assert.equal(isThawed(rollToday(record, 3, "2026-09-21").today), false);
  assert.equal(isThawed(rollToday(record, 0, "2026-09-22").today), true, "warm thaws at 0 turns");
});

test("enterBeat applies flags on line beats too (no skipped setFlags on line→line)", () => {
  const chapter = findChapter(template, "example-ch1")!;
  const end = findBeat(chapter, "end")!;
  const record = enterBeat({ ...fresh(), flags: { B1: "t" } }, chapter, end, 12, NOW);
  assert.equal(typeof record.flags.B3, "string", "end of Ch1 grants its entry flag even without explicit setFlags");
  assert.equal(record.beat, null);
});
