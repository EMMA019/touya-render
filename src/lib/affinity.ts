import type { CharacterId } from "./character-types";
import { AFFINITY_STORE_FILENAME } from "./config";
import { createJsonStore } from "./json-store";
import { levelFromCount, type AffinityPublic } from "./affinity-types";

export {
  AFFINITY_LEVELS,
  EMPTY_AFFINITY,
  levelFromCount,
  shouldIncrementAffinity,
  type AffinityPublic,
} from "./affinity-types";

type PairRecord = { count: number };
type StoreShape = { pairs: Record<string, PairRecord> };

const store = createJsonStore<StoreShape>({
  envKey: "AFFINITY_STORE_PATH",
  filename: AFFINITY_STORE_FILENAME,
  empty: () => ({ pairs: {} }),
});

function pairKey(visitorId: string, characterId: CharacterId): string {
  return `${visitorId}:${characterId}`;
}

function toPublic(record: PairRecord | undefined): AffinityPublic {
  return levelFromCount(record?.count ?? 0);
}

export async function readAffinity(visitorId: string, characterId: CharacterId): Promise<AffinityPublic> {
  return store.enqueue(async () => {
    const data = await store.read();
    return toPublic(data.pairs[pairKey(visitorId, characterId)]);
  });
}

export async function readAffinityMap(visitorId: string): Promise<Record<string, AffinityPublic>> {
  return store.enqueue(async () => {
    const data = await store.read();
    const prefix = `${visitorId}:`;
    const out: Record<string, AffinityPublic> = {};
    for (const [key, record] of Object.entries(data.pairs)) {
      if (!key.startsWith(prefix)) continue;
      const characterId = key.slice(prefix.length);
      if (characterId) out[characterId] = toPublic(record);
    }
    return out;
  });
}

/**
 * Apply a signed integer delta (floor 0). Chat scoring may clamp before calling.
 * Gifts pass the catalog value (+2..+4, plus an optional favorite bonus).
 */
export async function applyAffinityDelta(
  visitorId: string,
  characterId: CharacterId,
  delta: number,
): Promise<AffinityPublic> {
  const applied = Number.isFinite(delta) ? Math.trunc(delta) : 0;
  return store.enqueue(async () => {
    const data = await store.read();
    const key = pairKey(visitorId, characterId);
    const count = Math.max(0, (data.pairs[key]?.count ?? 0) + applied);
    data.pairs[key] = { count };
    await store.persist(data);
    return levelFromCount(count);
  });
}

export async function incrementAffinity(
  visitorId: string,
  characterId: CharacterId,
): Promise<AffinityPublic> {
  return applyAffinityDelta(visitorId, characterId, 1);
}

export function resetAffinityStore() {
  store.resetMemory();
}
