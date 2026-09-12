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
