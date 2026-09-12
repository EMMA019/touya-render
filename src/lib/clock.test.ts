import assert from "node:assert/strict";
import { test } from "node:test";
import { dayPart, daysBetween, readClock, shiftDayKey, streakEndingOn } from "./clock";

test("dayPart maps Japan hours", () => {
  assert.equal(dayPart(3), "night");
  assert.equal(dayPart(7), "dawn");
  assert.equal(dayPart(10), "morning");
  assert.equal(dayPart(15), "afternoon");
  assert.equal(dayPart(19), "evening");
  assert.equal(dayPart(22), "night");
});

test("readClock is Japan-local on a Saturday night", () => {
  const clock = readClock(new Date("2026-09-12T13:00:00.000Z"));
  assert.equal(clock.day, "2026-09-12");
  assert.equal(clock.weekday, "sat");
  assert.equal(clock.part, "night");
});

test("streak counts consecutive JST days only", () => {
  assert.equal(daysBetween("2026-09-10", "2026-09-13"), 3);
  assert.equal(shiftDayKey("2026-09-13", -1), "2026-09-12");
  assert.equal(streakEndingOn(["2026-09-11", "2026-09-12", "2026-09-13"], "2026-09-13"), 3);
  assert.equal(streakEndingOn(["2026-09-10", "2026-09-13"], "2026-09-13"), 1);
});
