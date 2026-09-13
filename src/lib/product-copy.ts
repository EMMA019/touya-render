import { FREE_DAILY_TURNS, PREMIUM_DAILY_TURNS } from "./config";

/** Landing / metadata. Behavior lives in prompt + memory + gate — not just these lines. */
export const META_TITLE = "燈夜 — 夜に、話せる相手がいる";
export const META_DESCRIPTION =
  "登録不要。雨のカフェ、終業後のオフィス、夜の屋上、黄昏のテラス。今夜の気分に合わせて相手を選べます。";

export const LANDING_KICKER = "とうや";
export const LANDING_HEADLINE = "夜に、話せる相手がいる。";
export const LANDING_LEAD =
  "雨の音を聴きながらでも、仕事帰りでも。4人の中から、今の気分に合う相手を選んでください。昨夜話した続きも覚えています。会員登録は不要です。";

export const DIFFERENCE_HEADING = "燈夜の特徴";

export const DIFFERENCES = [
  {
    title: "今の気分で相手を選ぶ",
    body: "甘えたい夜、少し突っかかってほしい夜、静かに隣にいてほしい夜、落ち着いて話したい夜。カードから今夜の相手を選んでください。",
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
    title: "モードで雰囲気が変わります", body: "既定はSFWです。NSFWは18歳確認のあとだけ。未成年や違法な内容はどのモードでも扱いません。",
  },
  {
    title: "登録不要。個人利用から",
    body: "お名前やメールアドレスは一切いただきません。広告や通数の案内は出しません。Booth はあとから。",
  },
  {
    title: "キャラクターが画面の主役",
    body: "見やすい立ち絵と衣装の切り替え。数字の通数表示で会話を邪魔しません。",
  },
] as const;

export const PREMIUM_HEADING = "広告なしで、ゆっくり話す";
export const PREMIUM_LEAD = `無料プランは1日${FREE_DAILY_TURNS}通まで（広告あり）。広告なしプランなら1日${PREMIUM_DAILY_TURNS}通まで楽しめます。どちらのプランでも、個人情報の登録は一切不要です。`;

export const POLICY_HEADING = "燈夜のこだわりと約束";
