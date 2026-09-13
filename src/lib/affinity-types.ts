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

/** Level-up beat attached when a turn crosses a threshold. */
export type AffinityEvent = AffinityPublic & {
  leveledUp: boolean;
  previousLevel: number;
  previousName: string;
  levelUpMessage: string | null;
};

export const AFFINITY_LEVELS: AffinityLevelRow[] = thresholds.levels;

/** Intimate / NSFW opens at 特別. Age gate is separate. See docs/DATING_SIM_GROWTH.md. */
export const NSFW_MIN_AFFINITY_LEVEL = Number(thresholds.nsfwFromLevel) || 2;

export const EMPTY_AFFINITY: AffinityPublic = levelFromCount(0);

export function affinityLevelName(level: number): string {
  const row = AFFINITY_LEVELS.find((item) => item.level === level);
  return row?.name ?? AFFINITY_LEVELS[0]?.name ?? "知り合い";
}

export function affinityLevelUpMessage(name: string): string {
  return `${name}になった`;
}

export function toAffinityEvent(
  previous: AffinityPublic,
  next: AffinityPublic,
): AffinityEvent {
  const leveledUp = next.level > previous.level;
  return {
    ...next,
    leveledUp,
    previousLevel: previous.level,
    previousName: previous.name,
    levelUpMessage: leveledUp ? affinityLevelUpMessage(next.name) : null,
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
