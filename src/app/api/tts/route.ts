import { getCharacter } from "@/lib/characters";
import { jsonApi, applyCors } from "@/lib/cors";
import {
  evaluateTtsRequest,
  hasIrodoriTts,
  isTtsFailure,
  loadVoiceMap,
  synthesizeSpeech,
} from "@/lib/tts";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export { OPTIONS } from "@/lib/cors";

/** Availability only. Does not ping Irodori — chat must work without it. */
export async function GET(request: Request) {
  return jsonApi(request, { configured: hasIrodoriTts() });
}

export async function POST(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) {
    return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  }

  let body: { characterId?: unknown; text?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonApi(request, { error: "invalid_json" }, { status: 400 });
  }

  const verdict = evaluateTtsRequest(body, {
    configured: hasIrodoriTts(),
    voiceMap: loadVoiceMap(),
    characterVoiceId: (id) => getCharacter(id)?.voiceId,
    knownCharacter: (id) => Boolean(getCharacter(id)),
  });
  if (!verdict.ok) {
    return jsonApi(
      request,
      { error: verdict.error, message: verdict.message },
      { status: verdict.status },
    );
  }

  const audio = await synthesizeSpeech(verdict);
  if (isTtsFailure(audio)) {
    return jsonApi(
      request,
      { error: audio.error, message: audio.message },
      { status: audio.status },
    );
  }

  return applyCors(
    new Response(Buffer.from(audio.bytes), {
      status: 200,
      headers: {
        "Content-Type": audio.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    }),
    request,
  );
}
