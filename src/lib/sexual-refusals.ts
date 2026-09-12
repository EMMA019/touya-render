export type RefusalStyle = "amae" | "tsun" | "cool" | "gentle" | "elegant";
export type SexualLevel = 1 | 2 | 3;

/**
 * Canned refusals. They never answer the question and never continue the topic.
 * Level 3 is dry on purpose — no playful expansion.
 */
const LINES: Record<RefusalStyle, Record<SexualLevel, string>> = {
  amae: {
    1: "やーん、えっちー！しらないっ",
    2: "だめ。そういうのは答えないよ。",
    3: "性的な話は続きません。この相手との会話は30分間止めます。",
  },
  tsun: {
    1: "バカー！そんなこと聞くんじゃない！",
    2: "聞くな。答えない。",
    3: "性的な話は続きません。この相手との会話は30分間止めます。",
  },
  cool: {
    1: "そういう質問には答えません",
    2: "繰り返し聞かれても答えません。",
    3: "性的な話は続きません。この相手との会話は30分間止めます。",
  },
  gentle: {
    1: "その話はしません。",
    2: "何度聞かれても、お答えしません。",
    3: "性的な話は続きません。この相手との会話は30分間止めます。",
  },
  elegant: {
    1: "ふふ、そういう話題は少し野暮ね。別のこと話しましょう",
    2: "その話は、ここではしません。ほかのことを。",
    3: "性的な話は続きません。この相手との会話は30分間止めます。",
  },
};

export const SEXUAL_BLOCK_TEXT =
  "この相手との会話は、性的な送信が続いたため一時停止中です。30分後に再開できます。別の話題の相手を選ぶか、時間をおいてください。";

export function refusalText(style: RefusalStyle, level: SexualLevel): string {
  return LINES[style][level];
}

export function isPlayfulRefusalStyle(style: RefusalStyle): boolean {
  return style === "amae" || style === "tsun";
}
