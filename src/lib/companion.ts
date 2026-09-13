import { EMPTY_AFFINITY, readAffinity, type AffinityPublic } from "./affinity";
import { readBond, touchBond } from "./bond";
import type { Bond } from "./bond-types";
import type { CharacterId, SituationPublic } from "./character-types";
import { readMemory } from "./memory-store";
import type { MemoryRow } from "./memory-types";
import {
  situationLocks,
  unlockedSituationIds,
  type UnlockContext,
  type UnlockReason,
} from "./situation-unlock";
import { effectiveLevel, nsfwEligible, readStory, settleOnOpen, toStoryPublic, updateStory } from "./story";
import { getStoryScript, toPublicScriptForChapter } from "./story-script";
import type { StoryPublic, StoryRecord, StoryScriptPublic } from "./story-types";
import { readVisitorProfile } from "./visitor-profile";

export type { MemoryRow } from "./memory-types";

export type CompanionState = {
  bond: Bond;
  memory: MemoryRow[];
  unlocked: string[];
  locks: Record<string, Exclude<UnlockReason, "open">>;
  affinity: AffinityPublic;
  story: StoryPublic;
  /** Only the chapter in progress (or none). Prompt hints are stripped. */
  script: StoryScriptPublic | null;
};

export function unlockContextFor(story: StoryPublic, nsfwAllowed: boolean, now = new Date()): UnlockContext {
  return {
    flags: story.flags,
    effectiveLevel: story.effectiveLevel,
    pendingChapter: story.pendingChapter,
    nsfwAllowed,
    now,
  };
}

export async function nsfwAllowedFor(visitorId: string): Promise<boolean> {
  const profile = await readVisitorProfile(visitorId);
  return profile.chatMode === "nsfw" && profile.ageConfirmed;
}

/**
 * Relationship half of the NSFW gate: effective band >= nsfwMinLevel().
 * With a character: that pair. Without (mode toggle is per visitor): any character qualifies.
 * Legacy visitors were granted the flags their count reached, so nothing they had closes.
 */
export async function nsfwRelationshipOk(visitorId: string, characterIds: CharacterId[]): Promise<boolean> {
  for (const characterId of characterIds) {
    const [affinity, record] = await Promise.all([
      readAffinity(visitorId, characterId),
      readStory(visitorId, characterId),
    ]);
    const settled = settleOnOpen(record, getStoryScript(characterId), affinity.count, { daysMet: 0, daysAway: 0 });
    if (nsfwEligible(effectiveLevel(affinity.count, settled.flags))) return true;
  }
  return false;
}

/** Story + unlocks for a visitor × character. `settle` runs migration / chapter start (companion open). */
export async function loadStoryState(
  visitorId: string,
  characterId: CharacterId,
  situations: SituationPublic[],
  affinity: AffinityPublic,
  bond: Bond,
  options: { settle?: boolean; now?: Date } = {},
): Promise<{ record: StoryRecord; story: StoryPublic; script: StoryScriptPublic | null; unlocked: string[]; locks: CompanionState["locks"] }> {
  const now = options.now ?? new Date();
  const scriptFull = getStoryScript(characterId);
  const record = options.settle
    ? await updateStory(visitorId, characterId, (current) =>
        settleOnOpen(current, scriptFull, affinity.count, bond, now),
      )
    : await readStory(visitorId, characterId);
  const story = toStoryPublic(record, affinity.count);
  const nsfwAllowed = await nsfwAllowedFor(visitorId);
  const ctx = unlockContextFor(story, nsfwAllowed, now);
  const script =
    scriptFull && record.chapterId ? toPublicScriptForChapter(scriptFull, record.chapterId) : null;
  return {
    record,
    story,
    script,
    unlocked: unlockedSituationIds(situations, ctx),
    locks: situationLocks(situations, ctx),
  };
}

export async function loadCompanion(
  visitorId: string,
  characterId: CharacterId,
  situations: SituationPublic[],
  markVisit = false
): Promise<CompanionState> {
  const memory = await readMemory(visitorId, characterId);
  const [bond, affinity] = await Promise.all([
    markVisit
      ? touchBond(visitorId, characterId, memory.length)
      : readBond(visitorId, characterId, memory.length),
    readAffinity(visitorId, characterId),
  ]);
  const state = await loadStoryState(visitorId, characterId, situations, affinity, bond, { settle: markVisit });
  return {
    bond,
    memory,
    affinity,
    unlocked: state.unlocked,
    locks: state.locks,
    story: state.story,
    script: state.script,
  };
}

export { EMPTY_AFFINITY };
