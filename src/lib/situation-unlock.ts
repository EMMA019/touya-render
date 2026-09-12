import { situationMinLevel, type SituationPublic } from "./character-types";
import { jstMonth } from "./config";

export const COSTUME_UNLOCK_DAYS = 3;
export const LOCKED_SITUATION_HINT = "もう少し話そう";

export function isHalloweenSeason(now = new Date()): boolean {
  return jstMonth(now) === 10;
}

export function isSituationUnlocked(
  scene: { season?: string; costume?: string; minLevel?: number },
  daysMet: number,
  now = new Date(),
  affinityLevel = 0,
): boolean {
  if (affinityLevel < situationMinLevel(scene)) return false;
  if (!scene.costume && !scene.season) return true;
  if (scene.season === "halloween" && isHalloweenSeason(now)) return true;
  return daysMet >= COSTUME_UNLOCK_DAYS;
}

export function unlockedSituationIds<T extends SituationPublic>(
  situations: T[],
  daysMet: number,
  now = new Date(),
  affinityLevel = 0,
): string[] {
  return situations
    .filter((scene) => isSituationUnlocked(scene, daysMet, now, affinityLevel))
    .map((scene) => scene.id);
}

/** Remaining JST days until a locked costume opens. null if already open or affinity-gated. */
export function daysUntilUnlock(
  scene: { season?: string; costume?: string; minLevel?: number },
  daysMet: number,
  now = new Date(),
  affinityLevel = 0,
): number | null {
  if (isSituationUnlocked(scene, daysMet, now, affinityLevel)) return null;
  if (affinityLevel < situationMinLevel(scene)) return null;
  return Math.max(1, COSTUME_UNLOCK_DAYS - daysMet);
}
