import "server-only";
import { EMPTY_AFFINITY, readAffinity, readAffinityMap } from "./affinity";
import { isCharacterId as rosterHasId, loadRoster } from "./catalog";
import {
  resolveArtStyle,
  toPublicSituation,
  type Character,
  type CharacterId,
  type CharacterPublic,
} from "./character-types";
import { canAccessNsfw } from "./chat-mode";
import { emptyVisitorProfile, readVisitorProfile } from "./visitor-profile";

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
  if (!visitorId) {
    return listPublicCharacters().map((character) => ({
      ...character,
      affinity: EMPTY_AFFINITY,
      nsfwUnlocked: false,
    }));
  }
  const [map, profile] = await Promise.all([
    readAffinityMap(visitorId),
    readVisitorProfile(visitorId),
  ]);
  return loadRoster().map((character) => {
    const affinity = map[character.id] ?? EMPTY_AFFINITY;
    const nsfwUnlocked = canAccessNsfw({
      affinityLevel: affinity.level,
      ageConfirmed: profile.ageConfirmed,
    });
    const nsfwAllowed = nsfwUnlocked && profile.chatMode === "nsfw";
    return {
      ...toPublic(character, { nsfwAllowed }),
      affinity,
      nsfwUnlocked,
    };
  });
}

export function getCharacter(id: string): Character | undefined {
  return loadRoster().find((character) => character.id === id);
}

export function getPublicCharacter(id: string): CharacterPublic | undefined {
  const full = getCharacter(id);
  return full ? toPublic(full, { nsfwAllowed: false }) : undefined;
}

export async function getPublicCharacterForVisitor(
  visitorId: string | null,
  id: string,
): Promise<CharacterPublic | undefined> {
  const full = getCharacter(id);
  if (!full) return undefined;
  if (!visitorId) {
    return { ...toPublic(full, { nsfwAllowed: false }), affinity: EMPTY_AFFINITY, nsfwUnlocked: false };
  }
  const [affinity, profile] = await Promise.all([
    readAffinity(visitorId, full.id),
    readVisitorProfile(visitorId),
  ]);
  const nsfwUnlocked = canAccessNsfw({
    affinityLevel: affinity.level,
    ageConfirmed: profile.ageConfirmed,
  });
  const nsfwAllowed = nsfwUnlocked && profile.chatMode === "nsfw";
  return {
    ...toPublic(full, { nsfwAllowed }),
    affinity,
    nsfwUnlocked,
  };
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
    nsfwUnlocked: false,
  };
}
