import type { CharacterId } from "./character-types";
import { AFFINITY_STORE_FILENAME } from "./config";
import { createJsonStore } from "./json-store";
import {
  clampAffinityDelta,
  levelFromCount,
  toAffinityEvent,
  type AffinityDelta,
  type AffinityEvent,
  type AffinityPublic,
} from "./affinity-types";

export {
  AFFINITY_BAND_COPY,
  AFFINITY_LEVELS,
  EMPTY_AFFINITY,
  NSFW_MIN_AFFINITY_LEVEL,
  affinityBandEvent,
  affinityLevelName,
  affinityLevelUpMessage,
  affinityToastMessage,
  affinityUnlockBlurb,
  clampAffinityDelta,
  levelFromCount,
  shouldAdjustAffinity,
  shouldIncrementAffinity,
  toAffinityEvent,
  type AffinityBandEvent,
  type AffinityDelta,
  type AffinityEvent,
  type AffinityPublic,
} from "./affinity-types";

type PairRecord = { count: number; seenBands?: number[] };
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

export async function applyAffinityDelta(
  visitorId: string,
  characterId: CharacterId,
  delta: number,
): Promise<AffinityEvent> {
  const clamped = clampAffinityDelta(delta);
  return store.enqueue(async () => {
    const data = await store.read();
    const key = pairKey(visitorId, characterId);
    const record = data.pairs[key];
    const previous = toPublic(record);
    const nextCount = Math.max(0, previous.count + clamped);
    const applied = (nextCount - previous.count) as AffinityDelta;
    const next = levelFromCount(nextCount);
    const seen = new Set(record?.seenBands ?? []);
    const firstBand = next.level > previous.level && !seen.has(next.level);
    if (firstBand) seen.add(next.level);
    data.pairs[key] = { count: nextCount, seenBands: [...seen] };
    await store.persist(data);
    const event = toAffinityEvent(previous, next, applied);
    if (!firstBand && event.leveledUp) {
      return { ...event, leveledUp: false, levelUpMessage: null, bandEvent: null, affinityToast: null };
    }
    return event;
  });
}

export async function incrementAffinity(
  visitorId: string,
  characterId: CharacterId,
): Promise<AffinityEvent> {
  return applyAffinityDelta(visitorId, characterId, 1);
}

export function resetAffinityStore() {
  store.resetMemory();
}
