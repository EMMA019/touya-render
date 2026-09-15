import { BOND_LINE, type BondStage } from "./bond-types";
import { bibleContract } from "./character-bible";
import type { Character, CharacterSituation } from "./character-types";
import { DEFAULT_CHAT_MODE, type ChatMode } from "./chat-mode";
import type { Clock } from "./clock";
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
import { affinityPromptLine } from "./reply-style";

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
  affinityName?: string;
  chatMode?: ChatMode;
};

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

/**
 * Gemma-friendly stack: role first, then world, then one behavior block.
 * Affinity and bond are not both injected — that used to stack "keep distance"
 * on top of "be short" and flatten SFW chat.
 */
export function buildSystemPrompt(
  character: Character,
  memorySummary: string,
  situation?: CharacterSituation,
  stage?: BondStage,
  context: PromptContext = {}
): string {
  const chatMode = context.chatMode ?? DEFAULT_CHAT_MODE;
  const parts = [
    `【役割】\n${character.systemPrompt}`,
    `【世界】\n${bibleContract(character.bible, character.situations, chatMode)}`,
    `【約束】\n${productBehaviorFor(chatMode)}`,
  ];
  if (context.affinityName) {
    parts.push(affinityPromptLine(context.affinityName, chatMode));
  } else if (stage) {
    parts.push(
      chatMode === "nsfw"
        ? `【距離】${BOND_LINE[stage]} NSFWでは距離が近くなくても、体型・性的な話題にはキャラの口調で乗ってよい。`
        : `【距離】${BOND_LINE[stage]}`
    );
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
    parts.push(`【連続】${context.streak}日続けて会っている。数字は言わない。嬉しさは短くてよい。`);
  }
  if (typeof context.remaining === "number" && context.remaining <= 2) {
    parts.push(
      "【終わり際】今日の残りが少ない。返事の最後に、明日への短い引きを一文。束縛や依存は言わない。"
    );
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
