import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CharacterPresence } from "./presence-types";
import {
  ART_STYLES,
  CHARACTER_ID,
  REFUSAL_STYLES,
  resolveArtStyle,
  type ArtStyle,
  type Character,
  type CharacterId,
  type RefusalStyle,
} from "./character-types";

const SKIP = /^_/;

export function catalogDir(): string {
  return join(process.cwd(), "shared/characters");
}

export function loadRoster(): Character[] {
  const dir = catalogDir();
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json") && !SKIP.test(name))
    .sort();
  const roster: Character[] = [];
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(dir, file), "utf8")) as Character;
    const raw: Character = {
      ...parsed,
      artStyle: resolveArtStyle(parsed.artStyle),
      presence: parsed.presence ?? loadPresence(parsed.id),
    };
    const issues = validateCharacter(raw, file);
    if (issues.length > 0) {
      throw new Error(`キャラ ${file} が不正です:\n- ${issues.join("\n- ")}`);
    }
    roster.push(raw);
  }
  return roster.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id));
}

export function validateCharacter(character: Character, file = ""): string[] {
  const issues: string[] = [];
  if (!CHARACTER_ID.test(character.id ?? "")) {
    issues.push("id は英小文字・数字・ハイフン（例: suzune）");
  }
  if (character.voiceId != null && character.voiceId !== "") {
    if (!CHARACTER_ID.test(character.voiceId)) {
      issues.push("voiceId は英小文字・数字・ハイフン");
    }
  }
  if (file && file !== `${character.id}.json` && file !== "_template.json") {
    issues.push(`ファイル名は ${character.id}.json にしてください`);
  }
  if ("age" in character || "age" in (character.bible ?? {})) {
    issues.push("年齢フィールドは置かない");
  }
  for (const key of [
    "name",
    "reading",
    "job",
    "tagline",
    "greeting",
    "welcomeBack",
    "farewell",
    "offline",
    "tone",
    "systemPrompt",
  ] as const) {
    if (!character[key] || String(character[key]).length < 2) issues.push(`${key} が短い`);
  }
  if (!REFUSAL_STYLES.includes(character.refusalStyle as RefusalStyle)) {
    issues.push(`refusalStyle は ${REFUSAL_STYLES.join(" / ")}`);
  }
  if (character.artStyle && !ART_STYLES.includes(character.artStyle as ArtStyle)) {
    issues.push(`artStyle は ${ART_STYLES.join(" / ")}`);
  }
  if (!character.systemPrompt?.includes("自分から並べない")) {
    issues.push("systemPrompt に「自分から並べない」を入れる");
  }
  if (!character.systemPrompt?.includes("フィクションの大人の女性")) {
    issues.push("systemPrompt に「フィクションの大人の女性」を入れる");
  }
  if (/\d+歳/.test(character.systemPrompt ?? "") || /\d+歳/.test(JSON.stringify(character.bible ?? {}))) {
    issues.push("年齢の数字は書かない");
  }
  if (!Array.isArray(character.situations) || character.situations.length < 1) {
    issues.push("situations を1つ以上");
  }
  if (!Array.isArray(character.suggestions) || character.suggestions.length < 1) {
    issues.push("suggestions を1つ以上");
  }
  if (!character.palette?.hair || !character.palette.from) {
    issues.push("palette.from と palette.hair が必要");
  }
  if (!character.bible?.never?.some((line) => line.includes("年齢を数字で言う"))) {
    issues.push("bible.never に「年齢を数字で言う」");
  }
  const blob = JSON.stringify(character.situations ?? []);
  if (/学生服|JK|女子高生|セーラー/.test(blob)) {
    issues.push("学生服・JK設定は禁止");
  }
  if (character.presence) {
    const presence = character.presence;
    if (!Array.isArray(presence.today) || presence.today.length < 8) {
      issues.push("presence.today を8本以上");
    }
    if (!Array.isArray(presence.hooks) || presence.hooks.length < 3) {
      issues.push("presence.hooks を3本以上");
    }
    for (const bucket of ["short", "few", "week"] as const) {
      if (!presence.absences?.[bucket] || presence.absences[bucket].length < 1) {
        issues.push(`presence.absences.${bucket}`);
      }
    }
  }
  for (const scene of character.situations ?? []) {
    if (!scene.id || !scene.title || !scene.setting || !scene.look) {
      issues.push(`situation ${scene.id ?? "?"} の必須欄`);
    }
    if (scene.look && !/文字を焼き込まない/.test(scene.look)) {
      issues.push(`${scene.id}: look に「服や背景に文字を焼き込まない」`);
    }
    if (scene.look && /下着見せ|パンツ|ランジェリー|裸/.test(scene.look)) {
      issues.push(`${scene.id}: 下着・裸の指定は禁止`);
    }
    if (scene.greeting != null && String(scene.greeting).trim().length < 2) {
      issues.push(`${scene.id}: greeting が短い`);
    }
    if (scene.lines != null) {
      if (!Array.isArray(scene.lines) || scene.lines.length < 2 || scene.lines.length > 3) {
        issues.push(`${scene.id}: lines は2〜3本`);
      } else {
        for (const line of scene.lines) {
          const text = typeof line === "string" ? line.trim() : String(line?.text ?? "").trim();
          if (text.length < 2) issues.push(`${scene.id}: lines が短い`);
          if (line && typeof line === "object" && line.minLevel != null) {
            const min = Number(line.minLevel);
            if (!Number.isInteger(min) || min < 0 || min > 3) {
              issues.push(`${scene.id}: line.minLevel は 0〜3`);
            }
          }
        }
      }
    }
    if (scene.minLevel != null) {
      const min = Number(scene.minLevel);
      if (!Number.isInteger(min) || min < 0 || min > 3) {
        issues.push(`${scene.id}: minLevel は 0〜3`);
      }
    }
    const lineBlob = Array.isArray(scene.lines)
      ? scene.lines.map((line) => (typeof line === "string" ? line : line?.text ?? "")).join(" ")
      : "";
    const cardBlob = `${scene.greeting ?? ""} ${lineBlob}`;
    if (/下着見せ|パンツ|ランジェリー|裸/.test(cardBlob)) {
      issues.push(`${scene.id}: カード台詞の下着・裸は禁止`);
    }
  }
  return issues;
}

function loadPresence(id: string): CharacterPresence | undefined {
  const file = join(process.cwd(), "shared/presence", `${id}.json`);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as CharacterPresence;
}

export function isCharacterId(id: string, roster: Character[] = loadRoster()): id is CharacterId {
  return roster.some((character) => character.id === id);
}
