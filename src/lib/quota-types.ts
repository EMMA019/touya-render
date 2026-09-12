import { FREE_DAILY_TURNS, REWARD_MAX_PER_DAY } from "./config";

export type Quota = {
  used: number;
  extra: number;
  limit: number;
  remaining: number;
  day: string;
  premium: boolean;
  rewardsLeft: number;
  debugUnlimited?: boolean;
};

/** First-paint placeholder. ChatView / SiteQuota replace this from /api/session. */
export const EMPTY_QUOTA: Quota = {
  used: 0,
  extra: 0,
  limit: FREE_DAILY_TURNS,
  remaining: FREE_DAILY_TURNS,
  day: "",
  premium: false,
  rewardsLeft: REWARD_MAX_PER_DAY,
};
