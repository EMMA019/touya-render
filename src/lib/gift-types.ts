import catalog from "../../shared/gifts.json";

export const GIFT_ID = /^[a-z][a-z0-9-]{1,24}$/;

export type GiftThanks = {
  default: string;
  [characterId: string]: string;
};

export type GiftItem = {
  id: string;
  name: string;
  hint: string;
  affinityDelta: number;
  premium: boolean;
  characterFavorites?: string[];
  thanks: GiftThanks;
};

export type GiftPublic = {
  id: string;
  name: string;
  hint: string;
  affinityDelta: number;
  /** Booth hook. Paid skins / packs later — no checkout in this MVP. */
  premium: boolean;
  favorite?: boolean;
};

export type GiftListPublic = {
  gifts: GiftPublic[];
  day: string;
  giftedToday: boolean | null;
  giftedTodayByCharacter: Record<string, boolean>;
};

export const GIFT_COOLDOWN_JA = "今日はもう贈ったよ。また明日ね。";

export const FAVORITE_BONUS = Number(catalog.favoriteBonus) || 1;

export const GIFT_CATALOG: GiftItem[] = validateCatalog(catalog.items as GiftItem[]);

export function getGift(id: string): GiftItem | undefined {
  return GIFT_CATALOG.find((gift) => gift.id === id);
}

export function isFavorite(gift: Pick<GiftItem, "characterFavorites">, characterId: string): boolean {
  return (gift.characterFavorites ?? []).includes(characterId);
}

export function giftDeltaFor(gift: GiftItem, characterId: string): number {
  const base = Number.isInteger(gift.affinityDelta) ? gift.affinityDelta : 0;
  return base + (isFavorite(gift, characterId) ? FAVORITE_BONUS : 0);
}

export function giftThanks(gift: GiftItem, characterId: string): string {
  const line = gift.thanks[characterId]?.trim() || gift.thanks.default?.trim();
  return line || "ありがとう。";
}

export function toPublicGift(gift: GiftItem, characterId?: string): GiftPublic {
  return {
    id: gift.id,
    name: gift.name,
    hint: gift.hint,
    affinityDelta: gift.affinityDelta,
    premium: Boolean(gift.premium),
    ...(characterId ? { favorite: isFavorite(gift, characterId) } : {}),
  };
}

/** Same copy as the affinity-stage PR toast, so gifts can reuse it without a second LLM. */
export function giftAffinityToast(delta: number, leveledUpName?: string | null): string {
  if (leveledUpName) return `${leveledUpName}になった`;
  if (delta >= 2) return "かなり親しくなった";
  if (delta === 1) return "少し親しくなった";
  return "受け取ってくれた";
}

function validateCatalog(items: GiftItem[]): GiftItem[] {
  if (!Array.isArray(items) || items.length < 3 || items.length > 6) {
    throw new Error("gifts.json: 3〜6個の閉じたカタログにしてください");
  }
  const seen = new Set<string>();
  for (const gift of items) {
    if (!GIFT_ID.test(gift.id ?? "")) {
      throw new Error(`gifts.json: 不正な id ${gift.id}`);
    }
    if (seen.has(gift.id)) throw new Error(`gifts.json: 重複 id ${gift.id}`);
    seen.add(gift.id);
    if (!gift.name?.trim() || !gift.hint?.trim()) {
      throw new Error(`gifts.json: ${gift.id} の name / hint`);
    }
    if (!Number.isInteger(gift.affinityDelta) || gift.affinityDelta < 2 || gift.affinityDelta > 4) {
      throw new Error(`gifts.json: ${gift.id} の affinityDelta は 2〜4`);
    }
    if (typeof gift.premium !== "boolean") {
      throw new Error(`gifts.json: ${gift.id} の premium は boolean（Booth 用。決済 UI は作らない）`);
    }
    if (!gift.thanks?.default?.trim()) {
      throw new Error(`gifts.json: ${gift.id} に thanks.default`);
    }
    if (gift.characterFavorites && !Array.isArray(gift.characterFavorites)) {
      throw new Error(`gifts.json: ${gift.id} の characterFavorites`);
    }
  }
  return items;
}
