export const EXPRESSIONS = ["neutral", "smile", "troubled"] as const;

export type Expression = (typeof EXPRESSIONS)[number];

const TROUBLED =
  /ごめん|ごめ|やめて|だめ|ダメ|違う|ちがう|無理|むり|答えな|続きません|止ま|詰まっ|届かない|言葉が出ない|……|…{2,}/;

const SMILE =
  /[!！♪♡♥]|ふふ|うれしい|嬉しい|いいよ|いいわ|わかる|一緒|おかえり|温かい|待ってた|隣|どうぞ|構わない|置いとく|座/;

export function classifyExpression(text: string): Expression {
  const trimmed = text.trim();
  if (!trimmed) return "neutral";
  if (TROUBLED.test(trimmed)) return "troubled";
  if (SMILE.test(trimmed)) return "smile";
  return "neutral";
}
