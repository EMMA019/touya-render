import { NSFW_MIN_AFFINITY_LEVEL, affinityLevelName, levelFromCount } from "./affinity-types";
import type { CharacterId } from "./character-types";
import { STORY_STORE_FILENAME, jstDayKey, nsfwMinLevel } from "./config";
import { createJsonStore } from "./json-store";
import type { MemoryRow } from "./memory-types";
import { chapterFor, findBeat, findChapter } from "./story-script";
import {
  ENTRY_FLAG,
  STORY_FLAGS,
  type StoryBeat,
  type StoryChapter,
  type StoryChapterNumber,
  type StoryChoice,
  type StoryFlag,
  type PromptStory,
  type StoryPublic,
  type StoryRecord,
  type StoryScript,
  type StoryToday,
  type Warmth,
} from "./story-types";

/**
 * Story progress store + pure derivations. Spec: docs/MEETING_FLOW_SPEC.md §1.2–1.3, §2.
 * Invariants (tested): flags never clear, effectiveLevel never drops,
 * no beat transition touches the LLM, quota or affinity.
 */

export { ENTRY_FLAG };
/** Design default (特別). Runtime value may be lowered via TOUYA_NSFW_MIN_LEVEL — see nsfwMinLevel(). */
export const NSFW_MIN_LEVEL = NSFW_MIN_AFFINITY_LEVEL;
export const DEFER_TURNS = 5;
export const THAW_TURNS: Record<Warmth, number> = { warm: 0, cool: 2, cold: 4 };
export const NEVER_MET_NAME = "はじめて";

export function emptyToday(day = jstDayKey()): StoryToday {
  return { day, turns: 0, warmth: "warm" };
}

export function emptyStoryRecord(day = jstDayKey()): StoryRecord {
  return {
    scriptVersion: null,
    chapterId: null,
    beat: null,
    flags: {},
    metVia: null,
    revealed: [],
    choices: {},
    deferredUntil: null,
    legacy: false,
    today: emptyToday(day),
  };
}

export function flagList(flags: StoryRecord["flags"]): StoryFlag[] {
  return STORY_FLAGS.filter((flag) => typeof flags[flag] === "string");
}

/** Highest band whose entry flag chain is complete. -1 before B1. */
export function flagLevel(flags: StoryRecord["flags"]): -1 | 0 | 1 | 2 | 3 {
  let level: -1 | 0 | 1 | 2 | 3 = -1;
  for (const chapter of [0, 1, 2, 3] as StoryChapterNumber[]) {
    if (typeof flags[ENTRY_FLAG[chapter]] !== "string") break;
    level = chapter;
  }
  return level;
}

export function rawLevel(count: number): 0 | 1 | 2 | 3 {
  return Math.min(3, Math.max(0, levelFromCount(count).level)) as 0 | 1 | 2 | 3;
}

/** min(raw band from count, band earned by chapter flags). */
export function effectiveLevel(count: number, flags: StoryRecord["flags"]): -1 | 0 | 1 | 2 | 3 {
  return Math.min(rawLevel(count), flagLevel(flags)) as -1 | 0 | 1 | 2 | 3;
}

export function effectiveName(level: number): string {
  return level < 0 ? NEVER_MET_NAME : affinityLevelName(level);
}

/** Next chapter to play: raw band is ahead of the flags and Ch2 is not deferred. */
export function pendingChapter(count: number, record: Pick<StoryRecord, "flags" | "deferredUntil">): StoryChapterNumber | null {
  const raw = rawLevel(count);
  const eff = effectiveLevel(count, record.flags);
  if (raw <= eff) return null;
  const next = (eff + 1) as StoryChapterNumber;
  if (next === 2 && record.deferredUntil != null && count < record.deferredUntil) return null;
  return next;
}

export function warmthOf(daysAway: number): Warmth {
  if (daysAway >= 7) return "cold";
  if (daysAway >= 2) return "cool";
  return "warm";
}

export function isThawed(today: StoryToday): boolean {
  return today.turns >= THAW_TURNS[today.warmth];
}

/** First contact of a JST day fixes the warmth; later turns only count up. */
export function rollToday(record: StoryRecord, daysAway: number, day = jstDayKey()): StoryRecord {
  if (record.today?.day === day) return record;
  return { ...record, today: { day, turns: 0, warmth: warmthOf(daysAway) } };
}

export function bumpTodayTurns(record: StoryRecord): StoryRecord {
  return { ...record, today: { ...record.today, turns: record.today.turns + 1 } };
}

/** B2 named: set by a choice, or derived from a profile-kind memory (call name). */
export function deriveNamed(record: StoryRecord, memory: MemoryRow[]): boolean {
  if (typeof record.flags.B2 === "string") return true;
  return memory.some((row) => row.kind === "profile");
}

export function nsfwEligible(level: number): boolean {
  return level >= nsfwMinLevel();
}

export function toStoryPublic(record: StoryRecord, count: number): StoryPublic {
  const level = effectiveLevel(count, record.flags);
  return {
    chapterId: record.chapterId,
    beat: record.beat,
    flags: flagList(record.flags),
    metVia: record.metVia,
    effectiveLevel: level,
    effectiveName: effectiveName(level),
    pendingChapter: pendingChapter(count, record),
    warmth: record.today?.warmth ?? "warm",
    nsfwEligible: nsfwEligible(level),
  };
}

/** Prompt-side view. Server-only lines (metViaLines / reveals) resolved here. */
export function promptStory(record: StoryRecord, count: number, script: StoryScript | null): PromptStory | undefined {
  if (typeof record.flags.B1 !== "string") return undefined;
  const level = effectiveLevel(count, record.flags);
  const metVia = record.metVia ?? "default";
  const metViaLine = script?.metViaLines?.[metVia];
  const revealedLines = record.revealed
    .map((id) => script?.reveals?.[id])
    .filter((line): line is string => typeof line === "string" && line.length > 0);
  return {
    metVia,
    metViaLine: metViaLine || undefined,
    effectiveLevel: level,
    effectiveName: effectiveName(level),
    flags: flagList(record.flags),
    revealed: [...record.revealed],
    revealedLines: revealedLines.length > 0 ? revealedLines : undefined,
  };
}

// ---------------------------------------------------------------------------
// Pure transitions (no I/O). The store wrappers below persist their results.

function withFlags(record: StoryRecord, flags: StoryFlag[] | undefined, at: string): StoryRecord {
  if (!flags || flags.length === 0) return record;
  const next = { ...record.flags };
  for (const flag of flags) if (typeof next[flag] !== "string") next[flag] = at;
  return { ...record, flags: next };
}

function withReveals(record: StoryRecord, reveals: string[] | undefined): StoryRecord {
  if (!reveals || reveals.length === 0) return record;
  const merged = Array.from(new Set([...record.revealed, ...reveals]));
  return { ...record, revealed: merged };
}

/**
 * Enter a beat: apply its setFlags / reveals, then park on it. `end` and
 * `defer` close the chapter (beat = null) after applying. One place for every
 * path in (start / choice / advance / free), so `line → line` never skips flags.
 */
export function enterBeat(
  record: StoryRecord,
  chapter: StoryChapter,
  beat: StoryBeat,
  count: number,
  now = new Date(),
): StoryRecord {
  const at = now.toISOString();
  let next = withReveals(withFlags(record, beat.setFlags, at), beat.reveals);
  if (beat.kind === "end") {
    next = withFlags(next, [ENTRY_FLAG[chapter.chapter]], at);
    if (chapter.chapter === 0 && !next.metVia) next = { ...next, metVia: "default" };
    return { ...next, chapterId: null, beat: null, deferredUntil: null };
  }
  if (beat.kind === "defer") {
    return { ...next, chapterId: null, beat: null, deferredUntil: count + DEFER_TURNS };
  }
  return { ...next, chapterId: chapter.id, beat: beat.id };
}

export function startChapter(record: StoryRecord, script: StoryScript, chapter: StoryChapter, count: number, now = new Date()): StoryRecord {
  const reentry = chapter.chapter === 2 && record.deferredUntil != null
    ? chapter.beats.find((beat) => beat.kind === "retry")
    : undefined;
  const entry = reentry ?? findBeat(chapter, chapter.entry);
  if (!entry) return record;
  return enterBeat({ ...record, scriptVersion: script.version }, chapter, entry, count, now);
}

/** Script has no chapter N: clear it silently so bands keep opening. */
export function autoCompleteChapter(record: StoryRecord, chapter: StoryChapterNumber, now = new Date()): StoryRecord {
  const at = now.toISOString();
  let next = withFlags(record, [ENTRY_FLAG[chapter]], at);
  if (chapter === 0 && !next.metVia) next = { ...next, metVia: "default" };
  return { ...next, chapterId: null, beat: null, deferredUntil: null };
}

/** Existing visitor (talked before this feature): grant every band the count already reached. */
export function migrateLegacy(record: StoryRecord, count: number, daysMet: number, now = new Date()): StoryRecord {
  const fresh = flagList(record.flags).length === 0 && record.beat === null && !record.legacy;
  if (!fresh) return record;
  if (count <= 0 && daysMet < 2) return record;
  const at = now.toISOString();
  const raw = rawLevel(count);
  let next: StoryRecord = { ...record, legacy: true, metVia: "legacy" };
  for (const chapter of [0, 1, 2, 3] as StoryChapterNumber[]) {
    if (chapter > raw) break;
    next = withFlags(next, [ENTRY_FLAG[chapter]], at);
  }
  return next;
}

export type ChoiceResult =
  | { ok: true; record: StoryRecord; beat: StoryBeat; choice: StoryChoice; next: StoryBeat }
  | { ok: false; error: "story_out_of_step" | "story_bad_choice" };

export function applyChoice(
  record: StoryRecord,
  script: StoryScript,
  chapterId: string,
  beatId: string,
  choiceId: string,
  count: number,
  now = new Date(),
): ChoiceResult {
  const chapter = findChapter(script, chapterId);
  const beat = findBeat(chapter, beatId);
  if (!chapter || !beat || record.chapterId !== chapterId || record.beat !== beatId || beat.kind !== "choice") {
    return { ok: false, error: "story_out_of_step" };
  }
  const choice = beat.choices?.find((row) => row.id === choiceId);
  const next = choice ? findBeat(chapter, choice.next) : null;
  if (!choice || !next) return { ok: false, error: "story_bad_choice" };
  const at = now.toISOString();
  let updated: StoryRecord = {
    ...record,
    choices: { ...record.choices, [`${chapterId}/${beatId}`]: choiceId },
  };
  updated = withReveals(withFlags(updated, choice.setFlags, at), choice.reveals);
  if (choice.metVia && chapter.chapter === 0) updated = { ...updated, metVia: choice.metVia };
  updated = enterBeat(updated, chapter, next, count, now);
  return { ok: true, record: updated, beat, choice, next };
}

export type AdvanceResult =
  | { ok: true; record: StoryRecord; next: StoryBeat }
  | { ok: false; error: "story_out_of_step" | "story_bad_beat" };

/** `line` / `retry` → next. `free` advances only through advanceFreeBeat. */
export function advanceBeat(
  record: StoryRecord,
  script: StoryScript,
  chapterId: string,
  beatId: string,
  count: number,
  now = new Date(),
): AdvanceResult {
  const chapter = findChapter(script, chapterId);
  const beat = findBeat(chapter, beatId);
  if (!chapter || !beat || record.chapterId !== chapterId || record.beat !== beatId) {
    return { ok: false, error: "story_out_of_step" };
  }
  if (beat.kind !== "line" && beat.kind !== "retry") return { ok: false, error: "story_bad_beat" };
  const next = findBeat(chapter, beat.next);
  if (!next) return { ok: false, error: "story_bad_beat" };
  return { ok: true, record: enterBeat(record, chapter, next, count, now), next };
}

/** After the one LLM reply of a `free` beat. */
export function advanceFreeBeat(record: StoryRecord, script: StoryScript, count: number, now = new Date()): StoryRecord {
  const chapter = findChapter(script, record.chapterId);
  const beat = findBeat(chapter, record.beat);
  if (!chapter || !beat || beat.kind !== "free") return record;
  const next = findBeat(chapter, beat.next);
  if (!next) return record;
  return enterBeat(record, chapter, next, count, now);
}

/** The `free` beat the visitor is parked on, if the client named it correctly. */
export function currentFreeBeat(record: StoryRecord, script: StoryScript | null, chapterId?: string, beatId?: string): StoryBeat | null {
  if (!script || !chapterId || !beatId) return null;
  if (record.chapterId !== chapterId || record.beat !== beatId) return null;
  const beat = findBeat(findChapter(script, chapterId), beatId);
  return beat && beat.kind === "free" ? beat : null;
}

/**
 * Open the chat: legacy migration, today's warmth, then start (or auto-clear)
 * the pending chapter until nothing is pending or a beat is waiting.
 */
export function settleOnOpen(
  record: StoryRecord,
  script: StoryScript | null,
  count: number,
  bond: { daysMet: number; daysAway: number },
  now = new Date(),
  day = jstDayKey(now),
): StoryRecord {
  let next = rollToday(migrateLegacy(record, count, bond.daysMet, now), bond.daysAway, day);
  for (let guard = 0; guard < 5 && next.beat === null; guard += 1) {
    const pending = pendingChapter(count, next);
    if (pending === null) break;
    const chapter = chapterFor(script, pending);
    if (!chapter || !script) {
      next = autoCompleteChapter(next, pending, now);
      continue;
    }
    next = startChapter(next, script, chapter, count, now);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Store

type StoreShape = { pairs: Record<string, StoryRecord> };

const store = createJsonStore<StoreShape>({
  envKey: "STORY_STORE_PATH",
  filename: STORY_STORE_FILENAME,
  empty: () => ({ pairs: {} }),
});

function pairKey(visitorId: string, characterId: CharacterId): string {
  return `${visitorId}:${characterId}`;
}

function normalize(row: StoryRecord | undefined): StoryRecord {
  const base = emptyStoryRecord();
  if (!row || typeof row !== "object") return base;
  const flags: StoryRecord["flags"] = {};
  for (const flag of STORY_FLAGS) {
    const at = row.flags?.[flag];
    if (typeof at === "string") flags[flag] = at;
  }
  return {
    scriptVersion: Number.isInteger(row.scriptVersion) ? row.scriptVersion : null,
    chapterId: typeof row.chapterId === "string" ? row.chapterId : null,
    beat: typeof row.beat === "string" ? row.beat : null,
    flags,
    metVia: typeof row.metVia === "string" ? row.metVia : null,
    revealed: Array.isArray(row.revealed) ? row.revealed.filter((id) => typeof id === "string") : [],
    choices: row.choices && typeof row.choices === "object" ? row.choices : {},
    deferredUntil: Number.isInteger(row.deferredUntil) ? row.deferredUntil : null,
    legacy: row.legacy === true,
    today:
      row.today && typeof row.today.day === "string"
        ? {
            day: row.today.day,
            turns: Number.isInteger(row.today.turns) ? row.today.turns : 0,
            warmth: row.today.warmth === "cool" || row.today.warmth === "cold" ? row.today.warmth : "warm",
          }
        : base.today,
  };
}

export async function readStory(visitorId: string, characterId: CharacterId): Promise<StoryRecord> {
  return store.enqueue(async () => {
    const data = await store.read();
    return normalize(data.pairs[pairKey(visitorId, characterId)]);
  });
}

export async function writeStory(visitorId: string, characterId: CharacterId, record: StoryRecord): Promise<StoryRecord> {
  return store.enqueue(async () => {
    const data = await store.read();
    data.pairs[pairKey(visitorId, characterId)] = record;
    await store.persist(data);
    return record;
  });
}

/** Read-modify-write under the store queue. `update` must be pure. */
export async function updateStory(
  visitorId: string,
  characterId: CharacterId,
  update: (record: StoryRecord) => StoryRecord,
): Promise<StoryRecord> {
  return store.enqueue(async () => {
    const data = await store.read();
    const key = pairKey(visitorId, characterId);
    const next = update(normalize(data.pairs[key]));
    data.pairs[key] = next;
    await store.persist(data);
    return next;
  });
}

export function resetStoryStore() {
  store.resetMemory();
}
