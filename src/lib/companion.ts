import { EMPTY_AFFINITY, NSFW_MIN_AFFINITY_LEVEL, readAffinity, type AffinityPublic } from "./affinity";
import { readBond, touchBond } from "./bond";
import type { Bond } from "./bond-types";
import type { CharacterId, SituationPublic } from "./character-types";
import { readMemory } from "./memory-store";
import type { MemoryRow } from "./memory-types";
import { unlockedSituationIds } from "./situation-unlock";

export type { MemoryRow } from "./memory-types";

export type CompanionState = {
  bond: Bond;
  memory: MemoryRow[];
  unlocked: string[];
  affinity: AffinityPublic;
};

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
  return {
    bond,
    memory,
    affinity,
    unlocked: unlockedSituationIds(
      situations,
      bond.daysMet,
      new Date(),
      affinity.level,
      affinity.level >= NSFW_MIN_AFFINITY_LEVEL,
    ),
  };
}

export { EMPTY_AFFINITY };
