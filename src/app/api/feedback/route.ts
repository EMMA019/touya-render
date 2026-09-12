import { isCharacterId } from "@/lib/characters";
import { jsonApi } from "@/lib/cors";
import { recordFeedback } from "@/lib/feedback-store";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export async function POST(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return jsonApi(request, { error: "visitor_missing" }, { status: 400 });

  let body: { characterId?: string; situationId?: string; assistantText?: string; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonApi(request, { error: "invalid_json" }, { status: 400 });
  }

  if (!isCharacterId(body.characterId ?? "") || !body.assistantText?.trim()) {
    return jsonApi(request, { error: "bad_request" }, { status: 400 });
  }

  await recordFeedback({
    characterId: body.characterId as string,
    situationId: body.situationId,
    assistantText: body.assistantText,
    note: body.note,
  });
  return jsonApi(request, { ok: true });
}
