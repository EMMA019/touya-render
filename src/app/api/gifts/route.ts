import { getCharacter, isCharacterId } from "@/lib/characters";
import { jsonApi } from "@/lib/cors";
import { GIFT_COOLDOWN_JA, giveGift, listGiftsForVisitor } from "@/lib/gifts";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  const characterId = new URL(request.url).searchParams.get("characterId") ?? "";
  if (characterId && !getCharacter(characterId)) {
    return jsonApi(request, { error: "unknown_character" }, { status: 400 });
  }
  const list = await listGiftsForVisitor(visitorId, characterId || undefined);
  return jsonApi(request, list);
}

export async function POST(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return jsonApi(request, { error: "visitor_missing" }, { status: 400 });

  let body: { characterId?: string; giftId?: string };
  try {
    body = (await request.json()) as { characterId?: string; giftId?: string };
  } catch {
    return jsonApi(request, { error: "invalid_json" }, { status: 400 });
  }

  if (!isCharacterId(body.characterId ?? "") || !getCharacter(body.characterId ?? "")) {
    return jsonApi(request, { error: "unknown_character" }, { status: 400 });
  }
  if (!body.giftId?.trim()) {
    return jsonApi(request, { error: "unknown_gift" }, { status: 400 });
  }

  const result = await giveGift(visitorId, body.characterId as string, body.giftId.trim());
  if (!result.ok) {
    if (result.error === "gift_cooldown") {
      return jsonApi(
        request,
        { error: result.error, message: result.message ?? GIFT_COOLDOWN_JA, giftedToday: true, day: result.day },
        { status: 429 },
      );
    }
    return jsonApi(request, { error: result.error, message: result.message }, { status: 400 });
  }

  // No extra LLM. Canned thanks + affinity bump only. Chat quota is unchanged.
  return jsonApi(request, result);
}
