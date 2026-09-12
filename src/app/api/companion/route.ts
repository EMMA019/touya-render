import { readAffinity } from "@/lib/affinity";
import { readBond, touchBond } from "@/lib/bond";
import { getCharacter, getPublicCharacter } from "@/lib/characters";
import { readMemory } from "@/lib/memory-store";
import { unlockedSituationIds } from "@/lib/situation-unlock";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return Response.json({ error: "visitor_missing" }, { status: 400 });
  const characterId = new URL(request.url).searchParams.get("characterId") ?? "";
  const character = getCharacter(characterId);
  const publicCharacter = getPublicCharacter(characterId);
  if (!character || !publicCharacter) {
    return Response.json({ error: "unknown_character" }, { status: 400 });
  }
  const facts = await readMemory(visitorId, character.id);
  const [bond, affinity] = await Promise.all([
    touchBond(visitorId, character.id, facts.length),
    readAffinity(visitorId, character.id),
  ]);
  return Response.json({
    bond,
    affinity,
    memory: facts.map(({ kind, text, at }) => ({ kind, text, at })),
    unlocked: unlockedSituationIds(publicCharacter.situations, bond.daysMet, new Date(), affinity.level),
  });
}

export async function POST(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return Response.json({ error: "visitor_missing" }, { status: 400 });
  let body: { characterId?: string };
  try {
    body = (await request.json()) as { characterId?: string };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const character = getCharacter(body.characterId ?? "");
  if (!character) return Response.json({ error: "unknown_character" }, { status: 400 });
  const facts = await readMemory(visitorId, character.id);
  const [bond, affinity] = await Promise.all([
    readBond(visitorId, character.id, facts.length),
    readAffinity(visitorId, character.id),
  ]);
  return Response.json({ bond, affinity });
}