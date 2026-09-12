import { BOND_LINE, type BondStage } from "./bond-types";
import { bibleContract } from "./character-bible";
import type { Character, CharacterSituation } from "./character-types";
import type { Clock } from "./clock";
import {
  COMPANION_NOT_NSFW,
  KNOW_DONT_VOLUNTEER,
  MEMORY_USE,
  ONE_REPLY_CONTRACT,
  PRODUCT_BEHAVIOR,
} from "./product-behavior";

export {
  COMPANION_NOT_NSFW,
  KNOW_DONT_VOLUNTEER,
  MEMORY_USE,
  ONE_REPLY_CONTRACT,
  PRODUCT_BEHAVIOR,
};

export type PromptContext = {
  clock?: Clock;
  daysAway?: number;
  streak?: number;
  remaining?: number;
  affinityName?: string;
};

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
  const parts = [
    character.systemPrompt,
    bibleContract(character.bible, character.situations),
    PRODUCT_BEHAVIOR,
  ];
  if (stage) {
    parts.push(`【距離】${BOND_LINE[stage]}`);
  }
  if (context.affinityName) {
    parts.push(`【親密度】${context.affinityName}。名前だけ持つ。数値や履歴は言わない。`);
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
  if (situation) {
    const look = situation.look
      ? situation.look.replace(/服や背景に文字を焼き込まない。?/g, "").replace(/\s{2,}/g, " ").trim()
      : "";
    parts.push(
      [
        `【今の場面】${situation.title}。${situation.setting}。`,
        look ? `見た目: ${look}` : "",
        "仮装でも服は着たまま。下着や肌の強調はしない。名札や看板の文字は言わない。聞かれない限り場面を並べない。返事は今の場面の空気に自然に合わせる。検索や別モデルは呼ばない。",
      ]
        .filter(Boolean)
        .join(""),
    );
  }
  if (memorySummary) {
    parts.push(`【覚えていること】${memorySummary}`, MEMORY_USE);
  }
  return parts.join("\n");
}
