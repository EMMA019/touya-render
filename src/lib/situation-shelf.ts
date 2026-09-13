import { NSFW_MIN_AFFINITY_LEVEL } from "./affinity-types";
import {
  LOCKED_INTIMATE_TITLE,
  situationNsfwOnly,
  type CharacterPublic,
  type SituationPublic,
} from "./character-types";
import {
  LOCKED_INTIMATE_HINT,
  isSituationUnlocked,
  situationLockHint,
} from "./situation-unlock";

export type ShelfTab = "all" | "daily" | "maid" | "nurse" | "miko" | "idol" | "halloween" | "sfw";

export const SHELF_TABS: { id: ShelfTab; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "daily", label: "日常" },
  { id: "maid", label: "メイド" },
  { id: "nurse", label: "ナース" },
  { id: "miko", label: "巫女" },
  { id: "idol", label: "アイドル" },
  { id: "halloween", label: "ハロウィン" },
  { id: "sfw", label: "SFW" },
];

export type ShelfCard = {
  key: string;
  characterId: string;
  characterName: string;
  givenName: string;
  situationId: string;
  title: string;
  subtitle: string;
  image: string | null;
  video: string | null;
  locked: boolean;
  lockHint: string | null;
  nsfwOnly: boolean;
  affinityLevel: number;
  affinityName: string;
  palette: CharacterPublic["palette"];
};

export function givenName(name: string): string {
  const part = name.trim().split(/\s+/).at(-1);
  return part || name;
}

export function situationSubtitle(scene: Pick<SituationPublic, "season" | "costume" | "nsfwOnly">): string {
  if (scene.nsfwOnly) return "特別な時間";
  if (scene.season === "halloween" || scene.costume === "halloween") return "ハロウィン衣装";
  if (scene.costume) return "特別衣装";
  return "日常の場所";
}

export function canRevealIntimate(affinityLevel: number): boolean {
  return affinityLevel >= NSFW_MIN_AFFINITY_LEVEL;
}

export function isDailySituation(scene: Pick<SituationPublic, "season" | "costume" | "nsfwOnly">): boolean {
  return !scene.costume && !scene.season && !scene.nsfwOnly;
}

/** Costume/season rows only have generated 390×844 stub rasters. Hide those from the shelf. */
export function hasFinishedSituationArt(scene: {
  costume?: string | null;
  season?: string | null;
  image?: string | null;
  video?: string | null;
}): boolean {
  if (scene.costume || scene.season) return false;
  return Boolean(scene.image || scene.video);
}

export function matchesShelfTab(scene: SituationPublic, tab: ShelfTab): boolean {
  if (tab === "all") return true;
  if (tab === "sfw") return !situationNsfwOnly(scene);
  if (tab === "daily") return isDailySituation(scene);
  if (tab === "halloween") return scene.season === "halloween" || scene.costume === "halloween";
  return scene.costume === tab;
}

export function collectShelfCards(
  roster: CharacterPublic[],
  filters: { characterId?: string | null; tab?: ShelfTab; now?: Date } = {},
): ShelfCard[] {
  const tab = filters.tab ?? "all";
  const now = filters.now ?? new Date();
  const cards: ShelfCard[] = [];
  for (const character of roster) {
    if (filters.characterId && character.id !== filters.characterId) continue;
    const affinityLevel = character.affinity?.level ?? 0;
    const nsfwAllowed = canRevealIntimate(affinityLevel);
    const unlockedIds = character.unlocked;
    for (const scene of character.situations) {
      if (!matchesShelfTab(scene, tab)) continue;
      if (!hasFinishedSituationArt(scene) && !situationNsfwOnly(scene)) continue;
      const nsfwOnly = situationNsfwOnly(scene);
      const unlocked =
        unlockedIds && unlockedIds.length > 0
          ? unlockedIds.includes(scene.id)
          : isSituationUnlocked(scene, 0, now, affinityLevel, nsfwAllowed);
      const hideArt = nsfwOnly && !unlocked;
      cards.push({
        key: `${character.id}:${scene.id}`,
        characterId: character.id,
        characterName: character.name,
        givenName: givenName(character.name),
        situationId: scene.id,
        title: hideArt ? LOCKED_INTIMATE_TITLE : scene.title,
        subtitle: situationSubtitle(scene),
        image: hideArt ? null : (scene.image ?? character.portraitImage ?? null),
        video: hideArt ? null : (scene.video ?? null),
        locked: !unlocked,
        lockHint: unlocked ? null : nsfwOnly ? LOCKED_INTIMATE_HINT : situationLockHint(scene, affinityLevel),
        nsfwOnly,
        affinityLevel,
        affinityName: character.affinity?.name ?? "知り合い",
        palette: character.palette,
      });
    }
  }
  return cards;
}

export function visibleShelfTabs(roster: CharacterPublic[]): { id: ShelfTab; label: string }[] {
  return SHELF_TABS.filter((tab) => {
    if (tab.id === "all" || tab.id === "sfw") return true;
    return roster.some((character) =>
      character.situations.some((scene) => matchesShelfTab(scene, tab.id) && hasFinishedSituationArt(scene)),
    );
  });
}
