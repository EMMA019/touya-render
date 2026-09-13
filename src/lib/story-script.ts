import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AGE_NUMBER, BANNED_NSFW_WORDS, BANNED_SCHOOL_WORDS } from "./catalog";
import type { CharacterSituation } from "./character-types";
import {
  BEAT_KINDS,
  STORY_FLAGS,
  type StoryBeat,
  type StoryBeatPublic,
  type StoryChapter,
  type StoryChapterNumber,
  type StoryFlag,
  type StoryScript,
  type StoryScriptPublic,
} from "./story-types";

/**
 * Story scripts: shared/story/{characterId}.json. `_`-prefixed files are templates.
 * Loaded and validated once per process; a broken script stops the server,
 * same strictness as loadRoster(). Spec: docs/MEETING_FLOW_SPEC.md §1, §5.
 */

const SKIP = /^_/;
const MAX_BUBBLE_CHARS = 120;
const MAX_LABEL_CHARS = 20;
const MAX_PROMPT_HINT_CHARS = 60;
const MAX_REVEAL_KINDS = 3;

export function storyDir(): string {
  return join(process.cwd(), "shared/story");
}

let cache: Map<string, StoryScript> | null = null;

export function loadStoryScripts(situationsOf?: (characterId: string) => CharacterSituation[] | undefined): Map<string, StoryScript> {
  if (cache) return cache;
  const dir = storyDir();
  const scripts = new Map<string, StoryScript>();
  if (!existsSync(dir)) {
    cache = scripts;
    return scripts;
  }
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json") && !SKIP.test(name))
    .sort();
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(dir, file), "utf8")) as StoryScript;
    const issues = validateStoryScript(parsed, {
      file,
      situations: situationsOf?.(parsed.characterId),
    });
    if (issues.length > 0) {
      throw new Error(`台本 ${file} が不正です:\n- ${issues.join("\n- ")}`);
    }
    scripts.set(parsed.characterId, parsed);
  }
  cache = scripts;
  return scripts;
}

export function resetStoryScriptCache() {
  cache = null;
}

export function getStoryScript(characterId: string): StoryScript | null {
  return loadStoryScripts().get(characterId) ?? null;
}

export function readStoryScriptFile(file: string): StoryScript {
  return JSON.parse(readFileSync(join(storyDir(), file), "utf8")) as StoryScript;
}

export function findChapter(script: StoryScript | null | undefined, chapterId: string | null | undefined): StoryChapter | null {
  if (!script || !chapterId) return null;
  return script.chapters.find((chapter) => chapter.id === chapterId) ?? null;
}

export function chapterFor(script: StoryScript | null | undefined, chapter: StoryChapterNumber): StoryChapter | null {
  if (!script) return null;
  return script.chapters.find((row) => row.chapter === chapter) ?? null;
}

export function findBeat(chapter: StoryChapter | null | undefined, beatId: string | null | undefined): StoryBeat | null {
  if (!chapter || !beatId) return null;
  return chapter.beats.find((beat) => beat.id === beatId) ?? null;
}

export function toPublicBeat(beat: StoryBeat): StoryBeatPublic {
  const { promptHint: _hint, ...rest } = beat;
  void _hint;
  return rest;
}

export function toPublicScript(script: StoryScript): StoryScriptPublic {
  return {
    characterId: script.characterId,
    version: script.version,
    chapters: script.chapters.map((chapter) => ({
      id: chapter.id,
      chapter: chapter.chapter,
      situationId: chapter.situationId,
      entry: chapter.entry,
      beats: chapter.beats.map(toPublicBeat),
    })),
  };
}

/** Public form limited to one chapter (what the client needs right now). */
export function toPublicScriptForChapter(script: StoryScript, chapterId: string): StoryScriptPublic | null {
  const chapter = findChapter(script, chapterId);
  if (!chapter) return null;
  return toPublicScript({ ...script, chapters: [chapter] });
}

const SENTENCE_END = /[。！？!?]/g;

/** Sentences = terminal punctuation marks; a bubble with none counts as one. Ellipses do not split. */
export function sentenceCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const ends = trimmed.match(SENTENCE_END)?.length ?? 0;
  return Math.max(1, ends);
}

function bannedIn(text: string): string | null {
  if (BANNED_SCHOOL_WORDS.test(text)) return "学校・制服の語";
  if (BANNED_NSFW_WORDS.test(text)) return "下着・裸・性的な語";
  if (AGE_NUMBER.test(text)) return "年齢の数字";
  return null;
}

/** Enumerate every entry→end path (flags gathered per path). Bounded by the DAG check. */
function walkPaths(chapter: StoryChapter): Array<{ beats: string[]; flags: Set<StoryFlag>; endKind: string }> {
  const byId = new Map(chapter.beats.map((beat) => [beat.id, beat]));
  const out: Array<{ beats: string[]; flags: Set<StoryFlag>; endKind: string }> = [];
  const visit = (id: string, trail: string[], flags: Set<StoryFlag>) => {
    const beat = byId.get(id);
    if (!beat || trail.includes(id) || trail.length > 64) return;
    const nextTrail = [...trail, id];
    const nextFlags = new Set(flags);
    for (const flag of beat.setFlags ?? []) nextFlags.add(flag);
    if (beat.kind === "end" || beat.kind === "defer") {
      out.push({ beats: nextTrail, flags: nextFlags, endKind: beat.kind });
      return;
    }
    if (beat.kind === "choice") {
      for (const choice of beat.choices ?? []) {
        const flags2 = new Set(nextFlags);
        for (const flag of choice.setFlags ?? []) flags2.add(flag);
        visit(choice.next, nextTrail, flags2);
      }
      return;
    }
    if (beat.next) visit(beat.next, nextTrail, nextFlags);
  };
  visit(chapter.entry, [], new Set());
  return out;
}

export function validateStoryScript(
  script: StoryScript,
  options: { file?: string; situations?: CharacterSituation[] } = {},
): string[] {
  const issues: string[] = [];
  const file = options.file ?? "";
  if (!script || typeof script !== "object") return ["JSON がオブジェクトではない"];
  if (!/^[a-z][a-z0-9-]{1,24}$/.test(script.characterId ?? "")) issues.push("characterId が不正");
  if (file && !SKIP.test(file) && file !== `${script.characterId}.json`) {
    issues.push(`ファイル名は ${script.characterId}.json にしてください`);
  }
  if (!Number.isInteger(script.version) || script.version < 1) issues.push("version は 1 以上の整数");
  if (!script.metViaLines || typeof script.metViaLines !== "object") issues.push("metViaLines が無い");
  if (!script.reveals || typeof script.reveals !== "object") issues.push("reveals が無い");
  if (!Array.isArray(script.chapters) || script.chapters.length < 1) {
    issues.push("chapters を 1 つ以上");
    return issues;
  }
  for (const [id, line] of Object.entries(script.metViaLines ?? {})) {
    if (typeof line !== "string" || line.length < 8 || line.length > 48) issues.push(`metViaLines.${id} は 8〜48 字`);
    const banned = typeof line === "string" ? bannedIn(line) : null;
    if (banned) issues.push(`metViaLines.${id}: ${banned}`);
  }
  const revealIds = Object.keys(script.reveals ?? {});
  if (revealIds.length > MAX_REVEAL_KINDS) issues.push(`reveals は ${MAX_REVEAL_KINDS} 種以内`);
  for (const id of revealIds) {
    const banned = bannedIn(String(script.reveals[id]));
    if (banned) issues.push(`reveals.${id}: ${banned}`);
  }

  const seenChapters = new Set<number>();
  for (const chapter of script.chapters) {
    const tag = chapter?.id ?? "?";
    if (![0, 1, 2, 3].includes(chapter.chapter)) issues.push(`${tag}: chapter は 0〜3`);
    if (seenChapters.has(chapter.chapter)) issues.push(`${tag}: chapter ${chapter.chapter} が重複`);
    seenChapters.add(chapter.chapter);
    if (chapter.id !== `${script.characterId}-ch${chapter.chapter}`) {
      issues.push(`${tag}: id は ${script.characterId}-ch${chapter.chapter}`);
    }
    if (!chapter.situationId) issues.push(`${tag}: situationId が無い`);
    if (options.situations) {
      const scene = options.situations.find((row) => row.id === chapter.situationId);
      if (!scene) issues.push(`${tag}: situationId ${chapter.situationId} がキャラの situations に無い`);
      else if (scene.costume || scene.season || scene.nsfwOnly) {
        issues.push(`${tag}: situationId は衣装・季節・nsfwOnly のない日常場面にする`);
      }
    }
    if (!Array.isArray(chapter.beats) || chapter.beats.length < 2) {
      issues.push(`${tag}: beats を 2 つ以上`);
      continue;
    }
    const byId = new Map<string, StoryBeat>();
    for (const beat of chapter.beats) {
      if (!beat.id || byId.has(beat.id)) issues.push(`${tag}: beat id が無いか重複 (${beat.id ?? "?"})`);
      byId.set(beat.id, beat);
    }
    if (!byId.has(chapter.entry)) issues.push(`${tag}: entry ${chapter.entry} が無い`);

    let freeCount = 0;
    let metViaBeats = 0;
    for (const beat of chapter.beats) {
      const bt = `${tag}/${beat.id}`;
      if (!BEAT_KINDS.includes(beat.kind)) issues.push(`${bt}: kind は ${BEAT_KINDS.join(" / ")}`);
      if (!Array.isArray(beat.text) || beat.text.length < 1 || beat.text.length > 2) {
        issues.push(`${bt}: text は 1〜2 要素`);
      } else {
        for (const bubble of beat.text) {
          if (typeof bubble !== "string" || bubble.trim().length < 2) issues.push(`${bt}: 吹き出しが短い`);
          else {
            if (bubble.length > MAX_BUBBLE_CHARS) issues.push(`${bt}: 吹き出しは ${MAX_BUBBLE_CHARS} 字以内`);
            const sentences = sentenceCount(bubble);
            if (sentences < 1 || sentences > 4) issues.push(`${bt}: 吹き出しは 1〜4 文`);
            const banned = bannedIn(bubble);
            if (banned) issues.push(`${bt}: ${banned}`);
          }
        }
      }
      if (beat.narration != null) {
        if (typeof beat.narration !== "string" || beat.narration.length > MAX_BUBBLE_CHARS) {
          issues.push(`${bt}: narration は ${MAX_BUBBLE_CHARS} 字以内の文字列`);
        } else {
          const banned = bannedIn(beat.narration);
          if (banned) issues.push(`${bt}: narration に${banned}`);
        }
      }
      for (const flag of beat.setFlags ?? []) {
        if (!STORY_FLAGS.includes(flag)) issues.push(`${bt}: setFlags は ${STORY_FLAGS.join("/")}`);
      }
      if ((beat.reveals ?? []).length > 1) issues.push(`${bt}: reveals は 1 要素まで`);
      for (const id of beat.reveals ?? []) {
        if (!(id in (script.reveals ?? {}))) issues.push(`${bt}: reveals.${id} が辞書に無い`);
      }
      if (beat.kind === "line" || beat.kind === "free" || beat.kind === "retry") {
        if (!beat.next || !byId.has(beat.next)) issues.push(`${bt}: next ${beat.next ?? "?"} が無い`);
      }
      if (beat.kind === "choice") {
        const choices = beat.choices ?? [];
        if (choices.length < 2 || choices.length > 3) issues.push(`${bt}: choices は 2〜3`);
        const ids = new Set<string>();
        let metViaCount = 0;
        for (const choice of choices) {
          const ct = `${bt}/${choice.id ?? "?"}`;
          if (!choice.id || ids.has(choice.id)) issues.push(`${ct}: choice id が無いか重複`);
          ids.add(choice.id);
          if (typeof choice.label !== "string" || choice.label.trim().length < 1) issues.push(`${ct}: label が無い`);
          else if (choice.label.length > MAX_LABEL_CHARS) issues.push(`${ct}: label は ${MAX_LABEL_CHARS} 字以内`);
          for (const text of [choice.label, choice.userText, choice.remember]) {
            const banned = text ? bannedIn(text) : null;
            if (banned) issues.push(`${ct}: ${banned}`);
          }
          if (!choice.next || !byId.has(choice.next)) issues.push(`${ct}: next ${choice.next ?? "?"} が無い`);
          if ((choice.reveals ?? []).length > 1) issues.push(`${ct}: reveals は 1 要素まで`);
          for (const id of choice.reveals ?? []) {
            if (!(id in (script.reveals ?? {}))) issues.push(`${ct}: reveals.${id} が辞書に無い`);
          }
          for (const flag of choice.setFlags ?? []) {
            if (!STORY_FLAGS.includes(flag)) issues.push(`${ct}: setFlags は ${STORY_FLAGS.join("/")}`);
          }
          if (choice.metVia) {
            metViaCount += 1;
            if (!(choice.metVia in (script.metViaLines ?? {}))) issues.push(`${ct}: metViaLines.${choice.metVia} が無い`);
          }
          if (choice.defer) {
            const target = byId.get(choice.next);
            if (!target || target.kind !== "defer") issues.push(`${ct}: defer の next は defer ビート`);
          }
        }
        if (metViaCount > 0) {
          metViaBeats += 1;
          if (metViaCount !== choices.length) issues.push(`${bt}: metVia は全選択肢に付ける`);
        }
      } else if (beat.choices && beat.choices.length > 0) {
        issues.push(`${bt}: choices は choice ビートだけ`);
      }
      if (beat.kind === "free") {
        freeCount += 1;
        if (typeof beat.promptHint !== "string" || beat.promptHint.trim().length < 4) {
          issues.push(`${bt}: free には promptHint`);
        } else {
          if (beat.promptHint.length > MAX_PROMPT_HINT_CHARS) issues.push(`${bt}: promptHint は ${MAX_PROMPT_HINT_CHARS} 字以内`);
          const banned = bannedIn(beat.promptHint);
          if (banned) issues.push(`${bt}: promptHint に${banned}`);
        }
      } else if (beat.promptHint) {
        issues.push(`${bt}: promptHint は free だけ`);
      }
      if (beat.hook && beat.kind !== "end") issues.push(`${bt}: hook は end だけ`);
      if (beat.hook) {
        const banned = bannedIn(beat.hook);
        if (banned) issues.push(`${bt}: hook に${banned}`);
      }
    }
    if (freeCount > 1) issues.push(`${tag}: free は 1 個まで`);

    // Reachability: every beat reachable from entry (or a retry re-entry), every beat reaches end/defer.
    const reach = new Set<string>();
    const stack = [chapter.entry, ...chapter.beats.filter((b) => b.kind === "retry").map((b) => b.id)];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (reach.has(id)) continue;
      const beat = byId.get(id);
      if (!beat) continue;
      reach.add(id);
      if (beat.next) stack.push(beat.next);
      for (const choice of beat.choices ?? []) stack.push(choice.next);
    }
    for (const beat of chapter.beats) {
      if (!reach.has(beat.id)) issues.push(`${tag}/${beat.id}: entry から到達できない`);
    }
    const terminals = new Set(chapter.beats.filter((b) => b.kind === "end" || b.kind === "defer").map((b) => b.id));
    if (!chapter.beats.some((b) => b.kind === "end")) issues.push(`${tag}: end ビートが無い`);
    const reachesEnd = new Map<string, boolean>();
    const canEnd = (id: string, seen: Set<string>): boolean => {
      if (terminals.has(id)) return true;
      if (reachesEnd.has(id)) return reachesEnd.get(id)!;
      if (seen.has(id)) return false;
      const beat = byId.get(id);
      if (!beat) return false;
      seen.add(id);
      const nexts = beat.kind === "choice" ? (beat.choices ?? []).map((c) => c.next) : beat.next ? [beat.next] : [];
      const ok = nexts.length > 0 && nexts.every((next) => canEnd(next, seen));
      reachesEnd.set(id, ok);
      return ok;
    };
    for (const beat of chapter.beats) {
      if (reach.has(beat.id) && !canEnd(beat.id, new Set())) issues.push(`${tag}/${beat.id}: end に到達できない（循環か行き止まり）`);
    }

    // free must sit at least 3 beats in (not entry, not entry+1).
    const paths = walkPaths(chapter);
    for (const path of paths) {
      path.beats.forEach((id, index) => {
        if (byId.get(id)?.kind === "free" && index < 2) issues.push(`${tag}/${id}: free は entry から 2 ビート以内に置かない`);
      });
    }

    // Chapter-specific contracts.
    const entryFlag: Record<number, StoryFlag> = { 0: "B1", 1: "B3", 2: "B4", 3: "B5" };
    if (chapter.chapter === 0) {
      if (metViaBeats !== 1) issues.push(`${tag}: metVia を持つ choice はちょうど 1 つ`);
      const usedMetVia = new Set<string>();
      for (const beat of chapter.beats) for (const c of beat.choices ?? []) if (c.metVia) usedMetVia.add(c.metVia);
      for (const id of Object.keys(script.metViaLines ?? {})) {
        if (!usedMetVia.has(id)) issues.push(`${tag}: metViaLines.${id} を使う選択肢が無い`);
      }
      for (const path of paths) {
        if (path.endKind === "end" && !path.flags.has("B1")) issues.push(`${tag}: end で B1 が立たない経路がある`);
      }
    } else if (metViaBeats > 0) {
      issues.push(`${tag}: metVia は Ch0 だけ`);
    }
    if (chapter.chapter === 1 || chapter.chapter === 3) {
      const flag = entryFlag[chapter.chapter];
      for (const path of paths) {
        if (!path.flags.has(flag)) issues.push(`${tag}: 全経路で ${flag} を立てる`);
      }
    }
    if (chapter.chapter === 2) {
      const accepted = paths.some((path) => path.endKind === "end" && path.flags.has("B4"));
      const deferred = paths.some((path) => path.endKind === "defer");
      if (!accepted) issues.push(`${tag}: B4 を立てて end に至る経路が要る`);
      if (!deferred) issues.push(`${tag}: defer（まだ待って）の経路が要る`);
      if (!chapter.beats.some((b) => b.kind === "retry")) issues.push(`${tag}: retry ビートが要る`);
    }
  }
  return issues;
}
