import { readAffinity } from "@/lib/affinity";
import { readBond, touchBond } from "@/lib/bond";
import { getCharacter, getPublicCharacterForVisitor } from "@/lib/characters";
import { canAccessNsfw } from "@/lib/chat-mode";
import { jsonApi } from "@/lib/cors";
import { readMemory } from "@/lib/memory-store";
import { publicModeFromProfile } from "@/lib/mode-public";
import { unlockedSituationIds } from "@/lib/situation-unlock";
import { getVisitorId } from "@/lib/visitor";
import { readVisitorProfile } from "@/lib/visitor-profile";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  const characterId = new URL(request.url).searchParams.get("characterId") ?? "";
  const character = getCharacter(characterId);
  const publicCharacter = await getPublicCharacterForVisitor(visitorId, characterId);
  if (!character || !publicCharacter) {
    return jsonApi(request, { error: "unknown_character" }, { status: 400 });
  }
  const facts = await readMemory(visitorId, character.id);
  const [bond, affinity, profile] = await Promise.all([
    touchBond(visitorId, character.id, facts.length),
    readAffinity(visitorId, character.id),
    readVisitorProfile(visitorId),
  ]);
  const nsfwUnlocked = canAccessNsfw({
    affinityLevel: affinity.level,
    ageConfirmed: profile.ageConfirmed,
  });
  const nsfwAllowed = nsfwUnlocked && profile.chatMode === "nsfw";
  return jsonApi(request, {
    bond,
    affinity,
    nsfwUnlocked,
    mode: publicModeFromProfile(profile, affinity.level),
    memory: facts.map(({ kind, text, at }) => ({ kind, text, at })),
    situations: publicCharacter.situations,
    unlocked: unlockedSituationIds(
      character.situations,
      bond.daysMet,
      new Date(),
      affinity.level,
      nsfwAllowed,
    ),
  });
}

export async function POST(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  let body: { characterId?: string };
  try {
    body = (await request.json()) as { characterId?: string };
  } catch {
    return jsonApi(request, { error: "invalid_json" }, { status: 400 });
  }
  const character = getCharacter(body.characterId ?? "");
  if (!character) return jsonApi(request, { error: "unknown_character" }, { status: 400 });
  const facts = await readMemory(visitorId, character.id);
  const [bond, affinity, profile] = await Promise.all([
    readBond(visitorId, character.id, facts.length),
    readAffinity(visitorId, character.id),
    readVisitorProfile(visitorId),
  ]);
  return jsonApi(request, {
    bond,
    affinity,
    nsfwUnlocked: canAccessNsfw({
      affinityLevel: affinity.level,
      ageConfirmed: profile.ageConfirmed,
    }),
    mode: publicModeFromProfile(profile, affinity.level),
  });
}
