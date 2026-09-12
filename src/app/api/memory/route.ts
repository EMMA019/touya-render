import { getCharacter } from "@/lib/characters";
import { forgetFact, readMemory } from "@/lib/memory-store";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return Response.json({ error: "visitor_missing" }, { status: 400 });
  const characterId = new URL(request.url).searchParams.get("characterId") ?? "";
  if (!getCharacter(characterId)) {
    return Response.json({ error: "unknown_character" }, { status: 400 });
  }
  const facts = await readMemory(visitorId, characterId);
  return Response.json({
    facts: facts.map(({ kind, text, at }) => ({ kind, text, at })),
  });
}

export async function DELETE(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return Response.json({ error: "visitor_missing" }, { status: 400 });
  let body: { characterId?: string; text?: string };
  try {
    body = (await request.json()) as { characterId?: string; text?: string };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!getCharacter(body.characterId ?? "") || !body.text) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const facts = await forgetFact(visitorId, body.characterId as string, body.text);
  return Response.json({
    facts: facts.map(({ kind, text, at }) => ({ kind, text, at })),
  });
}
