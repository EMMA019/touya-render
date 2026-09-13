import type { CharacterId } from "./character-types";
import { applyAffinityDelta, readAffinity, type AffinityPublic } from "./affinity";
import { GIFT_STORE_FILENAME, jstDayKey } from "./config";
import { createJsonStore } from "./json-store";
import {
  GIFT_CATALOG,
  GIFT_COOLDOWN_JA,
  giftAffinityToast,
  giftDeltaFor,
  giftThanks,
  getGift,
  toPublicGift,
  type GiftListPublic,
  type GiftPublic,
} from "./gift-types";

export {
  FAVORITE_BONUS,
  GIFT_CATALOG,
  GIFT_COOLDOWN_JA,
  giftAffinityToast,
  giftDeltaFor,
  giftThanks,
  getGift,
  toPublicGift,
  type GiftItem,
  type GiftListPublic,
  type GiftPublic,
} from "./gift-types";

type PairRecord = { day: string; giftId: string };
type StoreShape = { pairs: Record<string, PairRecord> };

const store = createJsonStore<StoreShape>({
  envKey: "GIFT_STORE_PATH",
  filename: GIFT_STORE_FILENAME,
  empty: () => ({ pairs: {} }),
});

function pairKey(visitorId: string, characterId: CharacterId): string {
  return `${visitorId}:${characterId}`;
}

export type GiftGiveOk = {
  ok: true;
  giftId: string;
  giftName: string;
  thanks: string;
  favorite: boolean;
  affinityDelta: number;
  affinity: AffinityPublic;
  affinityToast: string;
  giftedToday: true;
  day: string;
};

export type GiftGiveCooldown = {
  ok: false;
  error: "gift_cooldown";
  message: string;
  giftedToday: true;
  day: string;
};

export type GiftGiveUnknown = {
  ok: false;
  error: "unknown_gift" | "unknown_character" | "premium_locked";
  message: string;
};

export type GiftGiveResult = GiftGiveOk | GiftGiveCooldown | GiftGiveUnknown;

export function listCatalog(characterId?: string): GiftPublic[] {
  return GIFT_CATALOG.map((gift) => toPublicGift(gift, characterId));
}

export async function readGiftedTodayMap(
  visitorId: string,
  now = new Date(),
): Promise<Record<string, boolean>> {
  const day = jstDayKey(now);
  return store.enqueue(async () => {
    const data = await store.read();
    const prefix = `${visitorId}:`;
    const out: Record<string, boolean> = {};
    for (const [key, record] of Object.entries(data.pairs)) {
      if (!key.startsWith(prefix)) continue;
      const characterId = key.slice(prefix.length);
      if (characterId) out[characterId] = record.day === day;
    }
    return out;
  });
}

export async function listGiftsForVisitor(
  visitorId: string | null,
  characterId?: string,
  now = new Date(),
): Promise<GiftListPublic> {
  const day = jstDayKey(now);
  const giftedTodayByCharacter = visitorId ? await readGiftedTodayMap(visitorId, now) : {};
  const giftedToday = characterId ? Boolean(giftedTodayByCharacter[characterId]) : null;
  return {
    gifts: listCatalog(characterId),
    day,
    giftedToday,
    giftedTodayByCharacter,
  };
}

export async function giveGift(
  visitorId: string,
  characterId: CharacterId,
  giftId: string,
  now = new Date(),
): Promise<GiftGiveResult> {
  const gift = getGift(giftId);
  if (!gift) {
    return { ok: false, error: "unknown_gift", message: "その贈り物は置けません。" };
  }
  // premium: Booth hook only. No checkout UI — treat as not yet sellable.
  if (gift.premium) {
    return { ok: false, error: "premium_locked", message: "この贈り物はまだ開けません。" };
  }

  const day = jstDayKey(now);
  return store.enqueue(async () => {
    const data = await store.read();
    const key = pairKey(visitorId, characterId);
    if (data.pairs[key]?.day === day) {
      return {
        ok: false as const,
        error: "gift_cooldown" as const,
        message: GIFT_COOLDOWN_JA,
        giftedToday: true as const,
        day,
      };
    }

    const favorite = (gift.characterFavorites ?? []).includes(characterId);
    const affinityDelta = giftDeltaFor(gift, characterId);
    const previous = await readAffinity(visitorId, characterId);
    const affinity = await applyAffinityDelta(visitorId, characterId, affinityDelta);
    const crossed = affinity.level > previous.level ? affinity.name : null;

    data.pairs[key] = { day, giftId: gift.id };
    await store.persist(data);
    return {
      ok: true as const,
      giftId: gift.id,
      giftName: gift.name,
      thanks: giftThanks(gift, characterId),
      favorite,
      affinityDelta,
      affinity,
      affinityToast: giftAffinityToast(affinityDelta, crossed),
      giftedToday: true as const,
      day,
    };
  });
}

export function resetGiftStore() {
  store.resetMemory();
}
