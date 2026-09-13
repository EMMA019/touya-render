import { readAffinity } from "@/lib/affinity";
import { readBond, touchBond } from "@/lib/bond";
import { getCharacter, getPublicCharacter } from "@/lib/characters";
import { loadStoryState } from "@/lib/companion";
import { jsonApi } from "@/lib/cors";
import { readMemory } from "@/lib/memory-store";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

/**
 * Open a chat. Order (spec §2.3): memory → touchBond → affinity → story settle
 * (legacy migration, today's warmth, pending chapter start) → unlocked / locks.
 * touchBond returns daysAway from before it stamps lastDay, so warmth is fixed here.
 */
export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  const characterId = new URL(request.url).searchParams.get("characterId") ?? "";
  const character = getCharacter(characterId);
  const publicCharacter = getPublicCharacter(characterId);
  if (!character || !publicCharacter) {
    return jsonApi(request, { error: "unknown_character" }, { status: 400 });
  }
  const facts = await readMemory(visitorId, character.id);
  const bond = await touchBond(visitorId, character.id, facts.length);
  const affinity = await readAffinity(visitorId, character.id);
  const state = await loadStoryState(visitorId, character.id, publicCharacter.situations, affinity, bond, {
    settle: true,
  });
  return jsonApi(request, {
    bond,
    affinity,
    memory: facts.map(({ kind, text, at }) => ({ kind, text, at })),
    unlocked: state.unlocked,
    locks: state.locks,
    story: state.story,
    script: state.script,
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
  const [bond, affinity] = await Promise.all([
    readBond(visitorId, character.id, facts.length),
    readAffinity(visitorId, character.id),
  ]);
  return jsonApi(request, { bond, affinity });
}
