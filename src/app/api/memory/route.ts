import { getCharacter } from "@/lib/characters";
import { jsonApi } from "@/lib/cors";
import { forgetFact, readMemory } from "@/lib/memory-store";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  const characterId = new URL(request.url).searchParams.get("characterId") ?? "";
  if (!getCharacter(characterId)) {
    return jsonApi(request, { error: "unknown_character" }, { status: 400 });
  }
  const facts = await readMemory(visitorId, characterId);
  return jsonApi(request, {
    facts: facts.map(({ kind, text, at }) => ({ kind, text, at })),
  });
}

export async function DELETE(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  let body: { characterId?: string; text?: string };
  try {
    body = (await request.json()) as { characterId?: string; text?: string };
  } catch {
    return jsonApi(request, { error: "invalid_json" }, { status: 400 });
  }
  if (!getCharacter(body.characterId ?? "") || !body.text) {
    return jsonApi(request, { error: "bad_request" }, { status: 400 });
  }
  const facts = await forgetFact(visitorId, body.characterId as string, body.text);
  return jsonApi(request, {
    facts: facts.map(({ kind, text, at }) => ({ kind, text, at })),
  });
}
