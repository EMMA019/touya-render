import { NSFW_MIN_AFFINITY_LEVEL, affinityLevelName } from "./affinity-types";
import {
  COSTUME_BAND,
  situationNsfwOnly,
  situationRequiredLevel,
  type SituationPublic,
} from "./character-types";
import { jstMonth } from "./config";
import { ENTRY_FLAG, type StoryChapterNumber, type StoryFlag } from "./story-types";

export { COSTUME_BAND, NSFW_MIN_AFFINITY_LEVEL, situationRequiredLevel };

/**
 * Situations open by affinity band + story flags. The "costume opens after 3
 * met days" gacha is gone; `bond.daysMet` no longer touches unlocks.
 *
 *   帯0 知り合い  daily SFW scenes                 → B1 (Ch0 cleared)
 *   帯1 仲良し    maid / nurse / halloween         → effectiveLevel >= 1 (B3)
 *   帯2 特別      miko / idol / nsfwOnly (default) → effectiveLevel >= 2 (B4); nsfwOnly also needs NSFW mode
 *   帯3 絆        nsfwOnly with `minLevel: 3`      → effectiveLevel >= 3 (B5)
 *   season        halloween scenes only open in October (JST); the band still applies
 *
 * effectiveLevel = min(band from count, band from chapter flags) — see story.ts.
 * Mirror: android/app/src/main/java/jp/touya/app/domain/Unlock.kt
 */
export type UnlockContext = {
  flags: StoryFlag[];
  /** -1 before Ch0, else 0..3 */
  effectiveLevel: number;
  pendingChapter: StoryChapterNumber | null;
  /** Visitor is in NSFW mode (age-confirmed). Gates `nsfwOnly` scenes. */
  nsfwAllowed?: boolean;
  now?: Date;
};

export type UnlockReason = "open" | "band" | "chapter" | "flag" | "season" | "mode";

export const LOCKED_HINT: Record<Exclude<UnlockReason, "open">, string> = {
  band: "もう少し話そう",
  chapter: "続きを見てから",
  flag: "もう少し話そう",
  season: "今は季節じゃない",
  mode: "NSFWモードで",
};

/** Kept for older call sites; same text as LOCKED_HINT.band. */
export const LOCKED_SITUATION_HINT = LOCKED_HINT.band;

/** SSR / offline fallback: nobody has a story yet, so treat the 知り合い band as reachable. */
export const OPTIMISTIC_UNLOCK: UnlockContext = { flags: ["B1"], effectiveLevel: 0, pendingChapter: null };

type UnlockScene = Pick<SituationPublic, "minLevel" | "costume" | "season" | "nsfwOnly" | "requires">;

export function isHalloweenSeason(now = new Date()): boolean {
  return jstMonth(now) === 10;
}

function inSeason(scene: UnlockScene, now: Date): boolean {
  if (!scene.season) return true;
  if (scene.season === "halloween") return isHalloweenSeason(now);
  return true;
}

/** Explicit `requires` plus the band's entry flag (B1 for daily, B3 for 仲良し costumes, …). */
export function requiredFlags(scene: UnlockScene): StoryFlag[] {
  const level = Math.min(3, situationRequiredLevel(scene)) as StoryChapterNumber;
  const entry = ENTRY_FLAG[level];
  return Array.from(new Set<StoryFlag>(["B1", entry, ...(scene.requires ?? [])]));
}

export function unlockReason(scene: UnlockScene, ctx: UnlockContext): UnlockReason {
  const now = ctx.now ?? new Date();
  if (!inSeason(scene, now)) return "season";
  const need = situationRequiredLevel(scene);
  if (ctx.effectiveLevel < need) {
    // The count already reached this band: only the pending chapter script stands between.
    return ctx.pendingChapter === need ? "chapter" : "band";
  }
  const missing = requiredFlags(scene).some((flag) => !ctx.flags.includes(flag));
  if (missing) return "flag";
  if (situationNsfwOnly(scene) && ctx.nsfwAllowed !== true) return "mode";
  return "open";
}

export function isSituationUnlocked(scene: UnlockScene, ctx: UnlockContext): boolean {
  return unlockReason(scene, ctx) === "open";
}

export function unlockedSituationIds<T extends SituationPublic>(situations: T[], ctx: UnlockContext): string[] {
  return situations.filter((scene) => isSituationUnlocked(scene, ctx)).map((scene) => scene.id);
}

/** `id → reason` for every locked scene (spec §2.3 `locks`). */
export function situationLocks<T extends SituationPublic>(
  situations: T[],
  ctx: UnlockContext,
): Record<string, Exclude<UnlockReason, "open">> {
  const out: Record<string, Exclude<UnlockReason, "open">> = {};
  for (const scene of situations) {
    const reason = unlockReason(scene, ctx);
    if (reason !== "open") out[scene.id] = reason;
  }
  return out;
}

/** Chip label for a locked scene. Names the band for band locks; never a number. */
export function situationLockHint(scene: UnlockScene, ctx: UnlockContext): string {
  const reason = unlockReason(scene, ctx);
  if (reason === "open") return "";
  if (reason === "band" && ctx.effectiveLevel >= 0) {
    return `${affinityLevelName(situationRequiredLevel(scene))}になったら`;
  }
  return LOCKED_HINT[reason];
}
