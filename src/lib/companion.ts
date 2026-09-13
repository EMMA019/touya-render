import { EMPTY_AFFINITY, readAffinity, type AffinityPublic } from "./affinity";
import { readBond, touchBond } from "./bond";
import type { Bond } from "./bond-types";
import type { CharacterId, SituationPublic } from "./character-types";
import { canAccessNsfw } from "./chat-mode";
import { readMemory } from "./memory-store";
import type { MemoryRow } from "./memory-types";
import { unlockedSituationIds } from "./situation-unlock";
import { emptyVisitorProfile, readVisitorProfile } from "./visitor-profile";

export type { MemoryRow } from "./memory-types";

export type CompanionState = {
  bond: Bond;
  memory: MemoryRow[];
  unlocked: string[];
  affinity: AffinityPublic;
  nsfwUnlocked: boolean;
};

export async function loadCompanion(
  visitorId: string,
  characterId: CharacterId,
  situations: SituationPublic[],
  markVisit = false,
): Promise<CompanionState> {
  const memory = await readMemory(visitorId, characterId);
  const [bond, affinity, profile] = await Promise.all([
    markVisit
      ? touchBond(visitorId, characterId, memory.length)
      : readBond(visitorId, characterId, memory.length),
    readAffinity(visitorId, characterId),
    readVisitorProfile(visitorId),
  ]);
  const nsfwUnlocked = canAccessNsfw({
    affinityLevel: affinity.level,
    ageConfirmed: profile.ageConfirmed,
  });
  const nsfwAllowed = nsfwUnlocked && profile.chatMode === "nsfw";
  return {
    bond,
    memory,
    affinity,
    nsfwUnlocked,
    unlocked: unlockedSituationIds(
      situations,
      bond.daysMet,
      new Date(),
      affinity.level,
      nsfwAllowed,
    ),
  };
}

export { EMPTY_AFFINITY };

export function nsfwAllowedForPair(input: {
  affinityLevel: number;
  ageConfirmed: boolean;
  chatMode?: string;
}): boolean {
  return (
    canAccessNsfw({
      affinityLevel: input.affinityLevel,
      ageConfirmed: input.ageConfirmed,
    }) && input.chatMode === "nsfw"
  );
}

export { emptyVisitorProfile };
