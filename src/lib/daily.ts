import { AFFINITY_LEVELS, NSFW_MIN_AFFINITY_LEVEL, type AffinityPublic } from "./affinity-types";
import { situationNsfwOnly, type CharacterPublic, type SituationPublic } from "./character-types";
import { daysBetween, hashPick } from "./clock";
import { jstDayKey } from "./config";
import { givenName, hasFinishedSituationArt } from "./situation-shelf";
import { isSituationUnlocked } from "./situation-unlock";

/** Fixed JST epoch so character rotation advances one roster slot per calendar day. */
export const DAILY_ROTATION_EPOCH = "2020-01-01";

export type DailyPick = {
  date: string;
  characterId: string;
  situationId: string;
  title: string;
  blurb: string;
  characterName: string;
  givenName: string;
  image: string | null;
  untilNext: number | null;
  untilNextName: string | null;
};

export type DailyPublic = DailyPick & {
  checkedIn: boolean;
  firstToday: boolean;
};

export function dailyHref(pick: Pick<DailyPick, "characterId" | "situationId">): string {
  return `/c/${pick.characterId}?s=${encodeURIComponent(pick.situationId)}`;
}

export function untilNextLabel(remaining: number | null | undefined, name?: string | null): string | null {
  if (remaining == null || remaining <= 0 || !name?.trim()) return null;
  return `あと${remaining}で${name.trim()}`;
}

export function nextBandProgress(affinity?: AffinityPublic | null): {
  remaining: number;
  name: string;
} | null {
  const nextAt = affinity?.nextAt;
  if (nextAt == null) return null;
  const remaining = Math.max(0, nextAt - (affinity?.count ?? 0));
  if (remaining <= 0) return null;
  const name = AFFINITY_LEVELS.find((row) => row.at === nextAt)?.name ?? null;
  if (!name) return null;
  return { remaining, name };
}

export function isDailyEligible(
  scene: SituationPublic,
  character: CharacterPublic,
  now = new Date(),
): boolean {
  if (situationNsfwOnly(scene)) return false;
  if (!hasFinishedSituationArt(scene)) return false;
  const affinityLevel = character.affinity?.level ?? 0;
  const nsfwAllowed = affinityLevel >= NSFW_MIN_AFFINITY_LEVEL;
  const unlockedIds = character.unlocked;
  const unlocked =
    unlockedIds && unlockedIds.length > 0
      ? unlockedIds.includes(scene.id)
      : isSituationUnlocked(scene, 0, now, affinityLevel, nsfwAllowed);
  return unlocked;
}

export function pickDailyFromRoster(
  roster: CharacterPublic[],
  visitorId: string | null,
  now = new Date(),
): DailyPick | null {
  const date = jstDayKey(now);
  const visitorKey = visitorId?.trim() || "anon";
  const dayOrdinal = daysBetween(DAILY_ROTATION_EPOCH, date);
  const rows = roster
    .map((character) => ({
      character,
      scenes: character.situations.filter((scene) => isDailyEligible(scene, character, now)),
    }))
    .filter((row) => row.scenes.length > 0);

  const chosen = rows.length > 0 ? pickRow(rows, visitorKey, date, dayOrdinal) : fallbackRow(roster);
  if (!chosen) return null;

  const { character, scene } = chosen;
  const nick = givenName(character.name);
  const next = nextBandProgress(character.affinity);
  return {
    date,
    characterId: character.id,
    situationId: scene.id,
    title: scene.title,
    blurb: dailyBlurb(nick, scene.title, character.tagline),
    characterName: character.name,
    givenName: nick,
    image: scene.image ?? character.portraitImage ?? null,
    untilNext: next?.remaining ?? null,
    untilNextName: next?.name ?? null,
  };
}

export function dailyBlurb(nick: string, title: string, tagline?: string): string {
  const who = nick.trim() || "今夜の相手";
  const scene = title.trim() || "いつもの場所";
  const hook = tagline?.trim();
  if (hook) return `${who}と、${scene}。${hook}`;
  return `${who}が、${scene}で待っている。`;
}

function pickRow(
  rows: { character: CharacterPublic; scenes: SituationPublic[] }[],
  visitorKey: string,
  date: string,
  dayOrdinal: number,
): { character: CharacterPublic; scene: SituationPublic } | null {
  const charIndex = (hashPick(visitorKey, 1_000_003) + dayOrdinal) % rows.length;
  const row = rows[charIndex];
  if (!row) return null;
  const sitIndex = hashPick(`${visitorKey}:${date}:${row.character.id}`, row.scenes.length);
  const scene = row.scenes[sitIndex];
  if (!scene) return null;
  return { character: row.character, scene };
}

function fallbackRow(
  roster: CharacterPublic[],
): { character: CharacterPublic; scene: SituationPublic } | null {
  for (const character of roster) {
    const scene = character.situations.find((row) => !situationNsfwOnly(row) && hasFinishedSituationArt(row));
    if (scene) return { character, scene };
  }
  return null;
}
