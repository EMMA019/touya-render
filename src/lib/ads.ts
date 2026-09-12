/**
 * AdMob-first placeholders.
 *
 * Do not invent real ad unit IDs. Leave env empty until a reviewed
 * AdMob / Google publisher account exists. Character chat must stay
 * non-NSFW positioned for network policy.
 *
 * Web MVP: AdMob web / GPT slots as labeled placeholders.
 * Android: AdMob banner + rewarded (phase 2).
 * Later mediation only if fill is weak: AppLovin, Unity Ads.
 */
export type AdPlacement = "banner" | "sidebar" | "infeed" | "rewarded";

export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== "0";
export const ADS_PROVIDER = "admob";

export const ADMOB_APP_ID = process.env.NEXT_PUBLIC_ADMOB_APP_ID?.trim() ?? "";
export const ADMOB_BANNER_UNIT = process.env.NEXT_PUBLIC_ADMOB_BANNER_UNIT?.trim() ?? "";
export const ADMOB_REWARDED_UNIT = process.env.NEXT_PUBLIC_ADMOB_REWARDED_UNIT?.trim() ?? "";

export const AD_COPY: Record<
  AdPlacement,
  { label: string; hint: string; size: string }
> = {
  banner: {
    label: "AdMob",
    hint: "バナー枠（キャラ一覧 / チャット）。ユニット ID は未設定。",
    size: "320 × 50 / 728 × 90",
  },
  sidebar: {
    label: "AdMob",
    hint: "サイド枠。デスクトップの余白。ポリシー確認後に差し込む。",
    size: "300 × 250",
  },
  infeed: {
    label: "AdMob",
    hint: "会話のあいだのインフィード。NSFW 隣接に置かない。",
    size: "fluid",
  },
  rewarded: {
    label: "AdMob Rewarded",
    hint: "広告を見て今日の通数を足す（スタブ）。",
    size: "fullscreen",
  },
};

/** Free tier is 10 turns. In-feed ads are reserved for long premium sessions. */
export function shouldInsertInfeed(messageIndex: number, premium = false): boolean {
  if (!premium) return false;
  return messageIndex > 0 && messageIndex % 8 === 7;
}
