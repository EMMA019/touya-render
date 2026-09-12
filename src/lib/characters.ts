import "server-only";
import { EMPTY_AFFINITY, readAffinityMap } from "./affinity";
import { isCharacterId as rosterHasId, loadRoster } from "./catalog";
import {
  resolveArtStyle,
  toPublicSituation,
  type Character,
  type CharacterId,
  type CharacterPublic,
} from "./character-types";

export type { Character, CharacterId, CharacterPublic } from "./character-types";
export { loadRoster, validateCharacter } from "./catalog";

export function listCharacters(): Character[] {
  return loadRoster();
}

export function listPublicCharacters(): CharacterPublic[] {
  return loadRoster().map(toPublic);
}

export async function listPublicCharactersForVisitor(
  visitorId: string | null,
): Promise<CharacterPublic[]> {
  const roster = listPublicCharacters();
  if (!visitorId) {
    return roster.map((character) => ({ ...character, affinity: EMPTY_AFFINITY }));
  }
  const map = await readAffinityMap(visitorId);
  return roster.map((character) => ({
    ...character,
    affinity: map[character.id] ?? EMPTY_AFFINITY,
  }));
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

function toPublic(character: Character): CharacterPublic {
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
    situations: character.situations.map(toPublicSituation),
    palette: character.palette,
    portrait: character.portrait,
    portraitImage: character.portraitImage ?? null,
    presence: character.presence,
    bwh: character.bible.bwh,
  };
}
