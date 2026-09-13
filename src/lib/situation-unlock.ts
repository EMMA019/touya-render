import { NSFW_MIN_AFFINITY_LEVEL } from "./affinity-types";
import { LOCKED_INTIMATE_TITLE, situationMinLevel, type SituationPublic } from "./character-types";
import { jstMonth } from "./config";

export const COSTUME_UNLOCK_DAYS = 3;
export const LOCKED_SITUATION_HINT = "もう少し話そう";
export const LOCKED_INTIMATE_HINT = "特別になってから";
export { LOCKED_INTIMATE_TITLE };

export function isHalloweenSeason(now = new Date()): boolean {
  return jstMonth(now) === 10;
}

export function isSituationUnlocked(
  scene: { season?: string; costume?: string; minLevel?: number; nsfwOnly?: boolean },
  daysMet: number,
  now = new Date(),
  affinityLevel = 0,
  nsfwAllowed = false,
): boolean {
  if (scene.nsfwOnly && !nsfwAllowed) return false;
  if (affinityLevel < situationMinLevel(scene)) return false;
  if (!scene.costume && !scene.season && !scene.nsfwOnly) return true;
  if (scene.nsfwOnly) return true;
  if (scene.season === "halloween" && isHalloweenSeason(now)) return true;
  return daysMet >= COSTUME_UNLOCK_DAYS;
}

export function unlockedSituationIds<T extends SituationPublic>(
  situations: T[],
  daysMet: number,
  now = new Date(),
  affinityLevel = 0,
  nsfwAllowed = false,
): string[] {
  return situations
    .filter((scene) => isSituationUnlocked(scene, daysMet, now, affinityLevel, nsfwAllowed))
    .map((scene) => scene.id);
}

/** Remaining JST days until a locked costume opens. null if already open or affinity-gated. */
export function daysUntilUnlock(
  scene: { season?: string; costume?: string; minLevel?: number; nsfwOnly?: boolean },
  daysMet: number,
  now = new Date(),
  affinityLevel = 0,
  nsfwAllowed = false,
): number | null {
  if (isSituationUnlocked(scene, daysMet, now, affinityLevel, nsfwAllowed)) return null;
  if (scene.nsfwOnly) return null;
  if (affinityLevel < situationMinLevel(scene)) return null;
  return Math.max(1, COSTUME_UNLOCK_DAYS - daysMet);
}

export function situationLockHint(
  scene: { nsfwOnly?: boolean; minLevel?: number },
  affinityLevel = 0,
): string {
  if (scene.nsfwOnly || situationMinLevel(scene) >= NSFW_MIN_AFFINITY_LEVEL) {
    return LOCKED_INTIMATE_HINT;
  }
  if (affinityLevel < situationMinLevel(scene)) return "もっと仲良くなったら";
  return LOCKED_SITUATION_HINT;
}

export function situationChipTitle(
  scene: Pick<SituationPublic, "title" | "nsfwOnly">,
  unlocked: boolean,
): string {
  if (!unlocked && scene.nsfwOnly) return LOCKED_INTIMATE_TITLE;
  return scene.title;
}
