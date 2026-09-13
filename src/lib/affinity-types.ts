import thresholds from "../../shared/affinity.json";

export type AffinityLevelRow = {
  level: number;
  name: string;
  at: number;
};

export type AffinityPublic = {
  count: number;
  level: number;
  name: string;
  nextAt: number | null;
  progress: number;
  remainingToNext: number | null;
};

/** One-shot beat when a turn crosses 仲良し / 特別 / 絆. */
export type AffinityBandEvent = {
  flag: string;
  level: number;
  name: string;
  title: string;
  blurb: string;
};

/** Chat SSE / companion payload after a scored turn. */
export type AffinityEvent = AffinityPublic & {
  affinityDelta: number;
  leveledUp: boolean;
  leveledDown: boolean;
  previousLevel: number;
  previousName: string;
  previousCount: number;
  levelUpMessage: string | null;
  affinityToast: string | null;
  bandEvent: AffinityBandEvent | null;
};

export type AffinityDelta = -1 | 0 | 1 | 2;

export const AFFINITY_LEVELS: AffinityLevelRow[] = thresholds.levels;

/** Intimate / NSFW opens at 特別. Age gate is separate (PR #7). */
export const NSFW_MIN_AFFINITY_LEVEL = Number(thresholds.nsfwFromLevel) || 2;

export const EMPTY_AFFINITY: AffinityPublic = levelFromCount(0);

export const AFFINITY_BAND_COPY: Record<string, { title: string; blurb: string }> = {
  仲良し: {
    title: "仲良しになった",
    blurb: "少し打ち解けた。返事が柔らかくなる。",
  },
  特別: {
    title: "特別になった",
    blurb: "距離が縮まった。特別な話は、ここから。",
  },
  絆: {
    title: "絆になった",
    blurb: "深いところまで預かった。もう、他人じゃない。",
  },
};

export function affinityLevelName(level: number): string {
  const row = AFFINITY_LEVELS.find((item) => item.level === level);
  return row?.name ?? AFFINITY_LEVELS[0]?.name ?? "知り合い";
}

export function affinityLevelUpMessage(name: string): string {
  return AFFINITY_BAND_COPY[name]?.title ?? `${name}になった`;
}

export function affinityUnlockBlurb(name: string): string | null {
  return AFFINITY_BAND_COPY[name]?.blurb ?? null;
}

export function affinityToastMessage(delta: number): string | null {
  if (delta >= 2) return "かなり親しくなった";
  if (delta === 1) return "少し親しくなった";
  if (delta < 0) return "少し距離ができた";
  return null;
}

export function affinityBandEvent(name: string, level: number): AffinityBandEvent | null {
  const copy = AFFINITY_BAND_COPY[name];
  if (!copy) return null;
  return {
    flag: `band:${name}`,
    level,
    name,
    title: copy.title,
    blurb: copy.blurb,
  };
}

export function clampAffinityDelta(delta: number): AffinityDelta {
  if (!Number.isFinite(delta)) return 0;
  const n = Math.trunc(delta);
  if (n <= -1) return -1;
  if (n >= 2) return 2;
  if (n === 1) return 1;
  return 0;
}

export function toAffinityEvent(
  previous: AffinityPublic,
  next: AffinityPublic,
  delta = next.count - previous.count,
): AffinityEvent {
  const leveledUp = next.level > previous.level;
  const leveledDown = next.level < previous.level;
  const band = leveledUp ? affinityBandEvent(next.name, next.level) : null;
  return {
    ...next,
    affinityDelta: delta,
    leveledUp,
    leveledDown,
    previousLevel: previous.level,
    previousName: previous.name,
    previousCount: previous.count,
    levelUpMessage: band ? `${band.title}。${band.blurb}` : null,
    affinityToast: leveledUp || leveledDown ? null : affinityToastMessage(delta),
    bandEvent: band,
  };
}

export function levelFromCount(count: number): AffinityPublic {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  const levels = AFFINITY_LEVELS;
  let current = levels[0] ?? { level: 0, name: "知り合い", at: 0 };
  for (const row of levels) {
    if (n >= row.at) current = row;
  }
  const next = levels.find((row) => row.level === current.level + 1);
  if (!next) {
    return {
      count: n,
      level: current.level,
      name: current.name,
      nextAt: null,
      progress: 1,
      remainingToNext: null,
    };
  }
  const span = Math.max(1, next.at - current.at);
  const into = Math.min(span, Math.max(0, n - current.at));
  return {
    count: n,
    level: current.level,
    name: current.name,
    nextAt: next.at,
    progress: into / span,
    remainingToNext: Math.max(0, next.at - n),
  };
}

/** True when a consumed user turn produced a reply. Situation greeting seeds never consume a turn. */
export function shouldIncrementAffinity(args: { consumedTurn: boolean }): boolean {
  return args.consumedTurn;
}

export const shouldAdjustAffinity = shouldIncrementAffinity;
