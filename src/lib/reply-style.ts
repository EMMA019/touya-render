import {
  MAX_COMPLETION_TOKENS,
  MAX_COMPLETION_TOKENS_LONGFORM,
  MAX_COMPLETION_TOKENS_STORY,
} from "./config";

/**
 * Reply length / shape. Orthogonal to SFW/NSFW (`chatMode`).
 * Same ids on Web, Android, and `/api/mode`.
 */
export type ReplyStyle = "basic" | "longform" | "story";

export const DEFAULT_REPLY_STYLE: ReplyStyle = "basic";
export const REPLY_STYLES: readonly ReplyStyle[] = ["basic", "longform", "story"];

export const REPLY_STYLE_LABELS: Record<ReplyStyle, string> = {
  basic: "基本",
  longform: "長文",
  story: "ストーリー",
};

/** Current companion length: short reply, one question. Used as 基本. */
export const KEEP_THE_THREAD =
  "【会話の続き】短い返事のあと、相手にひとつだけ問うことが多い。自分から設定を並べない。依存や束縛の言い方はしない。";

export const REPLY_STYLE_BASIC = KEEP_THE_THREAD;

export const REPLY_STYLE_LONGFORM =
  "【返信スタイル・長文】短文で切らない。いまの拍を、気持ち・場面の空気・具体で6〜12文まで伸ばしてよい。短い相槌だけで終わらせない。自分から聖書やプロフィールを並べない。依存や束縛の言い方はしない。毎回の疑問符で終わらせなくてよい。";

export const REPLY_STYLE_STORY =
  "【返信スタイル・ストーリー】短いチャットではなく、いまの場面の続きとして書く。地の文（様子・空気・仕草）と台詞を混ぜてよい。1通で1つの場面を進める。章立て・見出し・ナレーション専用の別人格にはしない。キャラの口調は崩さない。自分から設定を並べない。依存や束縛の言い方はしない。";

const CONTRACT: Record<ReplyStyle, string> = {
  basic: REPLY_STYLE_BASIC,
  longform: REPLY_STYLE_LONGFORM,
  story: REPLY_STYLE_STORY,
};

const TOKENS: Record<ReplyStyle, number> = {
  basic: MAX_COMPLETION_TOKENS,
  longform: MAX_COMPLETION_TOKENS_LONGFORM,
  story: MAX_COMPLETION_TOKENS_STORY,
};

export function parseReplyStyle(value: unknown): ReplyStyle | null {
  if (value === "basic" || value === "longform" || value === "story") return value;
  return null;
}

export function coerceReplyStyle(value: unknown): ReplyStyle {
  return parseReplyStyle(value) ?? DEFAULT_REPLY_STYLE;
}

export function replyStyleFor(style: ReplyStyle = DEFAULT_REPLY_STYLE): string {
  return CONTRACT[style] ?? CONTRACT.basic;
}

export function completionTokensFor(style: ReplyStyle = DEFAULT_REPLY_STYLE): number {
  return TOKENS[style] ?? TOKENS.basic;
}

export function replyStyleLabel(style: ReplyStyle = DEFAULT_REPLY_STYLE): string {
  return REPLY_STYLE_LABELS[style] ?? REPLY_STYLE_LABELS.basic;
}
