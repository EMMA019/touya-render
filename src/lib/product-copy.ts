import { FREE_DAILY_TURNS, PREMIUM_DAILY_TURNS } from "./config";

/** Landing / metadata. Behavior lives in prompt + memory + gate — not just these lines. */
export const META_TITLE = "燈夜 — 夜に、話せる相手がいる";
export const META_DESCRIPTION =
  "登録不要。無料枠は1日10通。雨のカフェ、終業後のオフィス、夜の屋上、黄昏のテラス。今夜の気分に合わせて相手を選べます。";

export const LANDING_KICKER = "とうや";
export const LANDING_HEADLINE = "夜に、話せる相手がいる。";
export const LANDING_LEAD = `雨の音を聴きながらでも、仕事帰りでも。4人の中から、今の気分に合う相手を選んでください。昨夜話した続きも覚えています。会員登録は不要です。無料枠は1日${FREE_DAILY_TURNS}通。日付が変わると、また話しかけられます。`;

export const DIFFERENCE_HEADING = "燈夜の特徴";

export const DIFFERENCES = [
  {
    title: "今の気分で相手を選ぶ",
    body: "甘えたい夜、少し突っかかってほしい夜、静かに隣にいてほしい夜、落ち着いて話したい夜。迷ったら診断からどうぞ。",
  },
  {
    title: "会うほど、距離が縮まる",
    body: "お呼びする名前と、大切な好みだけを記憶します。何気ない雑談を無駄に残すことはありません。会う日が増えるにつれて、灯りが少しずつ灯っていきます。",
  },
  {
    title: "衣装は、通い続けると開放",
    body: "最初はいつもの日常の場所から。通った日数が重なると、メイド服やハロウィン衣装などの特別な場面が選べるようになります。",
  },
  {
    title: "性的な話題はお断りしています",
    body: "性的なロールプレイや過度な話題には応じません。夜の時間を心地よく過ごすための、健全な相手です。",
  },
  {
    title: "登録不要。広告で運営しています",
    body: `お名前やメールアドレスは一切いただきません。無料枠は1日${FREE_DAILY_TURNS}通。短い広告を見ることで、その日だけ会話数を追加できます。`,
  },
  {
    title: "キャラクターが画面の主役",
    body: "見やすい立ち絵と衣装の切り替え。残りの会話数はシンプルな数字表示だけで、邪魔をしません。",
  },
] as const;

export const PREMIUM_HEADING = "広告なしで、ゆっくり話す";
export const PREMIUM_LEAD = `無料プランは1日${FREE_DAILY_TURNS}通まで（広告あり）。広告なしプランなら1日${PREMIUM_DAILY_TURNS}通まで楽しめます。どちらのプランでも、個人情報の登録は一切不要です。`;

export const POLICY_HEADING = "燈夜のこだわりと約束";
