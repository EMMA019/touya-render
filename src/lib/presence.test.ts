import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Clock } from "./clock";
import { composeOpening, pickTodayLine } from "./presence";
import type { CharacterPresence } from "./presence-types";

const nightSaturday: Clock = {
  day: "2026-09-12",
  hour: 22,
  month: 9,
  weekday: "sat",
  part: "night",
};

function load(id: string): CharacterPresence {
  return JSON.parse(readFileSync(join(process.cwd(), "shared/presence", `${id}.json`), "utf8"));
}

test("today line prefers night-and-saturday over a generic line", () => {
  const presence = load("hiyori");
  const text = pickTodayLine(presence, nightSaturday, "regular", "hiyori:2026-09-12");
  assert.ok(text);
  assert.match(text, /土曜|夜|席/);
});

test("same seed returns the same today line", () => {
  const presence = load("rione");
  const a = pickTodayLine(presence, nightSaturday, "familiar", "rione:2026-09-12");
  const b = pickTodayLine(presence, nightSaturday, "familiar", "rione:2026-09-12");
  assert.equal(a, b);
});

test("opening notices a three-day absence without blaming", () => {
  const opening = composeOpening({
    id: "shiraishi",
    greeting: "……来たの。",
    welcomeBack: "また来た。",
    presence: load("shiraishi"),
    clock: nightSaturday,
    stage: "familiar",
    daysAway: 4,
    streak: 1,
    firstVisit: false,
  });
  assert.equal(opening.kind, "absence");
  assert.doesNotMatch(opening.text, /怒|許さ|裏切り/);
});

test("hook recovery comes before today's weather", () => {
  const opening = composeOpening({
    id: "clara",
    greeting: "Bonsoir.",
    welcomeBack: "おかえりなさい。",
    presence: load("clara"),
    clock: nightSaturday,
    stage: "regular",
    daysAway: 1,
    streak: 2,
    hook: "また明日、テラスで。",
    firstVisit: false,
  });
  assert.equal(opening.kind, "hook");
  assert.match(opening.text, /テラス/);
});
