import { BOND_LINE, type BondStage } from "./bond-types";
import { bibleContract } from "./character-bible";
import type { Character, CharacterSituation } from "./character-types";
import { DEFAULT_CHAT_MODE, type ChatMode } from "./chat-mode";
import type { Clock } from "./clock";
import type { PromptStory, Warmth } from "./story-types";
import {
  COMPANION_ADULT_OK,
  COMPANION_NOT_NSFW,
  NSFW_ANSWER_DIRECT,
  KNOW_DONT_VOLUNTEER,
  MEMORY_USE,
  ONE_REPLY_CONTRACT,
  PRODUCT_BEHAVIOR,
  PRODUCT_BEHAVIOR_NSFW,
  productBehaviorFor,
} from "./product-behavior";

export {
  COMPANION_ADULT_OK,
  COMPANION_NOT_NSFW,
  NSFW_ANSWER_DIRECT,
  KNOW_DONT_VOLUNTEER,
  MEMORY_USE,
  ONE_REPLY_CONTRACT,
  PRODUCT_BEHAVIOR,
  PRODUCT_BEHAVIOR_NSFW,
  productBehaviorFor,
};

export type PromptContext = {
  clock?: Clock;
  daysAway?: number;
  streak?: number;
  remaining?: number;
  /** Effective band name (not the raw count band) when a story is present. */
  affinityName?: string;
  chatMode?: ChatMode;
  /** Story-derived relationship. Present ⇒ 【関係】 replaces 【距離】. */
  story?: PromptStory;
  warmth?: { level: Warmth; thawed: boolean };
  /** `free` beat promptHint from the script. Server-side only. */
  beatHint?: string;
};

/**
 * Tone by effective band. Layered on top of `character.systemPrompt`, never
 * replacing it: the character JSON keeps the voice, this row moves the distance.
 *   0 知り合い  polite, a little formal, no pet names
 *   1 仲良し    softer, first names, small jokes
 *   2 特別      openly fond, leans in, light テレ / デレ
 *   3 絆        lovers who have been together a while; calm warmth
 * 【関係】 is not permission to list the setting — 「並べない」 stays in the text.
 */
export const BAND_TONE: Record<0 | 1 | 2 | 3, string> = {
  0: "口調は丁寧で、少し距離がある。呼び名は使わない。踏み込みすぎない。",
  1: "口調は柔らかく、くだけてよい。名前を自然に使う。軽い冗談を一つ挟んでよい。",
  2: "好意を隠さない。甘え・デレ・照れをキャラの口調で出してよい。距離は近いが、設定や事情は自分から並べない。",
  3: "長く一緒にいる恋人の落ち着き。言葉は少なくても伝わる前提で話す。記憶は一文だけ使う。",
};

export const WARMTH_LINE: Record<Exclude<Warmth, "warm">, string> = {
  cool: "少し間が空いた。最初は一歩引いた口調。責めない。数字は言わない。",
  cold: "久しぶり。呼び名は使ってよいが甘さは抑える。自分から性的な話題や場面の誘いは出さない（聞かれたら答える）。責めない。",
};

const LEGACY_MET_LINE = "出会いの経緯には触れない。";

export function relationLine(story: PromptStory, chatMode: ChatMode): string {
  const parts: string[] = [];
  if (story.metVia === "legacy") parts.push(LEGACY_MET_LINE);
  else if (story.metViaLine) parts.push(`出会いは${story.metViaLine}。`);
  parts.push(`今は${story.effectiveName}。`);
  const band = Math.min(3, Math.max(0, story.effectiveLevel)) as 0 | 1 | 2 | 3;
  parts.push(BAND_TONE[band]);
  if (story.flags.includes("B2") && band >= 1) parts.push("呼び名を自然に使う。");
  if (story.flags.includes("B4") && band >= 2) parts.push("恋人。距離は近い。それでも自分から設定は並べない。");
  if (chatMode === "nsfw") {
    parts.push("NSFWでは距離が近くなくても、体型・性的な話題にはキャラの口調で乗ってよい。");
  }
  return `【関係】${parts.join("")}`;
}

const SITUATION_SHARED =
  "名札や看板の文字は言わない。聞かれない限り場面を並べない。返事は今の場面の空気に自然に合わせる。検索や別モデルは呼ばない。";

const SITUATION_SFW_CLOTHED = "仮装でも服は着たまま。下着や肌の強調はしない。";

/** Art-direction leftovers from SFW assets — strip in NSFW chat prompts. */
export function sanitizeSituationLook(look: string, mode: ChatMode): string {
  let next = look.replace(/服や背景に文字を焼き込まない。?/g, "").replace(/\s{2,}/g, " ").trim();
  if (mode === "nsfw") {
    next = next
      .replace(/肌は出さない。?/g, "")
      .replace(/下着や肌の強調はしない。?/g, "")
      .replace(/仮装でも服は着たまま。?/g, "")
      .replace(/裾は膝下。?/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return next;
}

function situationConstraint(mode: ChatMode): string {
  return mode === "nsfw" ? SITUATION_SHARED : `${SITUATION_SFW_CLOTHED}${SITUATION_SHARED}`;
}

const PART_JA: Record<string, string> = {
  dawn: "明け方",
  morning: "朝",
  afternoon: "昼すぎ",
  evening: "夕方",
  night: "夜",
};

const WEEK_JA: Record<string, string> = {
  sun: "日曜",
  mon: "月曜",
  tue: "火曜",
  wed: "水曜",
  thu: "木曜",
  fri: "金曜",
  sat: "土曜",
};

export function buildSystemPrompt(
  character: Character,
  memorySummary: string,
  situation?: CharacterSituation,
  stage?: BondStage,
  context: PromptContext = {}
): string {
  const chatMode = context.chatMode ?? DEFAULT_CHAT_MODE;
  const parts = [
    character.systemPrompt,
    bibleContract(character.bible, character.situations, chatMode),
    productBehaviorFor(chatMode),
  ];
  // 【距離】 (visit-count stage) only until a story exists; then 【関係】 carries the distance.
  if (stage && !context.story) {
    parts.push(
      chatMode === "nsfw"
        ? `【距離】${BOND_LINE[stage]} NSFWでは距離が近くなくても、体型・性的な話題にはキャラの口調で乗ってよい。`
        : `【距離】${BOND_LINE[stage]}`
    );
  }
  if (context.affinityName) {
    parts.push(
      chatMode === "nsfw"
        ? `【親密度】${context.affinityName}。名前だけ持つ。数値や履歴は言わない。低親密度なら口調は距離を置いてよいが、体型・性的な質問への拒否や仕事へのそらしはしない。`
        : `【親密度】${context.affinityName}。名前だけ持つ。数値や履歴は言わない。`
    );
  }
  if (context.story) {
    parts.push(relationLine(context.story, chatMode));
    if (context.story.revealedLines && context.story.revealedLines.length > 0) {
      parts.push(
        `【すでに話したこと】次は既に相手に話した: ${context.story.revealedLines.join("・")}。改めて紹介しない。触れるなら一言。`
      );
    }
  }
  if (context.warmth && context.warmth.level !== "warm" && !context.warmth.thawed) {
    parts.push(`【温度】${WARMTH_LINE[context.warmth.level]}`);
  }
  if (context.clock) {
    parts.push(
      `【今夜の時刻】${WEEK_JA[context.clock.weekday]}の${PART_JA[context.clock.part]}。時刻を自分から読み上げない。自然なときだけ一文。`
    );
  }
  if (typeof context.daysAway === "number" && context.daysAway >= 2) {
    parts.push(
      `【間】${context.daysAway}日ぶり。責めない。気づいている程度。依存の言い方はしない。`
    );
  }
  if (typeof context.streak === "number" && context.streak >= 3) {
    parts.push(`【連続】${context.streak}日続けて会っている。数字は言わない。嬉しさは短く。`);
  }
  if (typeof context.remaining === "number" && context.remaining <= 2) {
    parts.push(
      "【終わり際】今日の残りが少ない。返事の最後に、明日への短い引きを一文。束縛や依存は言わない。"
    );
  }
  if (context.beatHint?.trim()) {
    parts.push(`【いま】${context.beatHint.trim().slice(0, 80)}`);
  }
  if (situation) {
    const look = situation.look
      ? sanitizeSituationLook(situation.look, chatMode)
      : "";
    parts.push(
      [
        `【今の場面】${situation.title}。${situation.setting}。`,
        look ? `見た目: ${look}` : "",
        situationConstraint(chatMode),
      ]
        .filter(Boolean)
        .join(""),
    );
  }
  if (memorySummary) {
    parts.push(`【覚えていること】${memorySummary}`, MEMORY_USE);
  }
  if (chatMode === "nsfw") {
    parts.push(NSFW_ANSWER_DIRECT);
  }
  return parts.join("\n");
}
