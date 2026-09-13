import type { CharacterId } from "./character-types";
import { AFFINITY_STORE_FILENAME } from "./config";
import { createJsonStore } from "./json-store";
import { levelFromCount, type AffinityPublic } from "./affinity-types";

export {
  AFFINITY_LEVELS,
  EMPTY_AFFINITY,
  NSFW_MIN_AFFINITY_LEVEL,
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

export async function incrementAffinity(
  visitorId: string,
  characterId: CharacterId,
): Promise<AffinityPublic> {
  return store.enqueue(async () => {
    const data = await store.read();
    const key = pairKey(visitorId, characterId);
    const count = (data.pairs[key]?.count ?? 0) + 1;
    data.pairs[key] = { count };
    await store.persist(data);
    return levelFromCount(count);
  });
}

export function resetAffinityStore() {
  store.resetMemory();
}
