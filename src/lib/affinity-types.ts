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
};

export const AFFINITY_LEVELS: AffinityLevelRow[] = thresholds.levels;

/** Intimate / nsfwOnly cards open at 特別. Chat NSFW gate (PR #7) is separate. */
export const NSFW_MIN_AFFINITY_LEVEL = 2;

export const EMPTY_AFFINITY: AffinityPublic = levelFromCount(0);

export function levelFromCount(count: number): AffinityPublic {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  const levels = AFFINITY_LEVELS;
  let current = levels[0] ?? { level: 0, name: "知り合い", at: 0 };
  for (const row of levels) {
    if (n >= row.at) current = row;
  }
  const next = levels.find((row) => row.level === current.level + 1);
  if (!next) {
    return { count: n, level: current.level, name: current.name, nextAt: null, progress: 1 };
  }
  const span = Math.max(1, next.at - current.at);
  const into = Math.min(span, Math.max(0, n - current.at));
  return {
    count: n,
    level: current.level,
    name: current.name,
    nextAt: next.at,
    progress: into / span,
  };
}

/** True when a consumed user turn produced a reply. Situation greeting seeds never consume a turn. */
export function shouldIncrementAffinity(args: { consumedTurn: boolean }): boolean {
  return args.consumedTurn;
}
