import "server-only";
import { EMPTY_AFFINITY, NSFW_MIN_AFFINITY_LEVEL, readAffinityMap } from "./affinity";
import { readBond } from "./bond";
import { isCharacterId as rosterHasId, loadRoster } from "./catalog";
import {
  resolveArtStyle,
  toPublicSituation,
  type Character,
  type CharacterId,
  type CharacterPublic,
} from "./character-types";
import { unlockedSituationIds } from "./situation-unlock";

export type { Character, CharacterId, CharacterPublic } from "./character-types";
export { loadRoster, validateCharacter } from "./catalog";

export function listCharacters(): Character[] {
  return loadRoster();
}

export function listPublicCharacters(): CharacterPublic[] {
  return loadRoster().map((character) => toPublic(character, { nsfwAllowed: false }));
}

export async function listPublicCharactersForVisitor(
  visitorId: string | null,
): Promise<CharacterPublic[]> {
  const roster = loadRoster();
  if (!visitorId) {
    return roster.map((character) => {
      const pub = toPublic(character, { nsfwAllowed: false });
      return {
        ...pub,
        affinity: EMPTY_AFFINITY,
        unlocked: unlockedSituationIds(pub.situations, 0, new Date(), 0, false),
      };
    });
  }
  const map = await readAffinityMap(visitorId);
  return Promise.all(
    roster.map(async (character) => {
      const affinity = map[character.id] ?? EMPTY_AFFINITY;
      const nsfwAllowed = affinity.level >= NSFW_MIN_AFFINITY_LEVEL;
      const bond = await readBond(visitorId, character.id);
      const pub = toPublic(character, { nsfwAllowed });
      return {
        ...pub,
        affinity,
        unlocked: unlockedSituationIds(
          pub.situations,
          bond.daysMet,
          new Date(),
          affinity.level,
          nsfwAllowed,
        ),
      };
    }),
  );
}

export function getCharacter(id: string): Character | undefined {
  return loadRoster().find((character) => character.id === id);
}

export function getPublicCharacter(id: string): CharacterPublic | undefined {
  const full = getCharacter(id);
  return full ? toPublic(full) : undefined;
}

export function isCharacterId(id: string): id is CharacterId {
  return rosterHasId(id);
}

function toPublic(
  character: Character,
  access: { nsfwAllowed?: boolean } = {},
): CharacterPublic {
  return {
    id: character.id,
    name: character.name,
    reading: character.reading,
    job: character.job,
    tagline: character.tagline,
    greeting: character.greeting,
    welcomeBack: character.welcomeBack || character.greeting,
    farewell: character.farewell || "今日はここまでにしよう。また明日。",
    offline: character.offline || "今ちょっと言葉が出ない。少し待って、もう一度話して。",
    tone: character.tone,
    artStyle: resolveArtStyle(character.artStyle),
    suggestions: character.suggestions,
    situations: character.situations.map((scene) => toPublicSituation(scene, access)),
    palette: character.palette,
    portrait: character.portrait,
    portraitImage: character.portraitImage ?? null,
    presence: character.presence,
    bwh: character.bible.bwh,
  };
}
