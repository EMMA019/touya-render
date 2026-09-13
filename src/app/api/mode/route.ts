import { readAffinity } from "@/lib/affinity";
import { isCharacterId } from "@/lib/characters";
import {
  NSFW_AFFINITY_REQUIRED,
  NSFW_AGE_REQUIRED,
  nsfwDenialMessage,
} from "@/lib/chat-mode";
import { jsonApi } from "@/lib/cors";
import { publicModeFromProfile } from "@/lib/mode-public";
import { getVisitorId } from "@/lib/visitor";
import {
  applyVisitorModeChange,
  emptyVisitorProfile,
  readVisitorProfile,
} from "@/lib/visitor-profile";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

/** Current mode + age confirmation. Never returns the install id. */
export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  const profile = visitorId ? await readVisitorProfile(visitorId) : emptyVisitorProfile();
  const characterId = new URL(request.url).searchParams.get("characterId") ?? "";
  const affinityLevel =
    visitorId && isCharacterId(characterId)
      ? (await readAffinity(visitorId, characterId)).level
      : undefined;
  return jsonApi(request, publicModeFromProfile(profile, affinityLevel));
}

/**
 * Confirm 18+ and/or switch SFW ↔ NSFW.
 * NSFW needs age on the server AND this character at 特別.
 * Debug unlimited does not skip either gate.
 */
export async function POST(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) {
    return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  }

  let body: { confirmAge?: boolean; chatMode?: unknown; characterId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonApi(request, { error: "invalid_json" }, { status: 400 });
  }

  const characterId = typeof body.characterId === "string" ? body.characterId : "";
  const affinityLevel = isCharacterId(characterId)
    ? (await readAffinity(visitorId, characterId)).level
    : 0;

  const result = await applyVisitorModeChange(visitorId, {
    confirmAge: body.confirmAge === true,
    chatMode: body.chatMode,
    affinityLevel,
  });
  const mode = publicModeFromProfile(result.profile, affinityLevel);
  if (!result.ok) {
    const error =
      result.error === NSFW_AFFINITY_REQUIRED ? NSFW_AFFINITY_REQUIRED : NSFW_AGE_REQUIRED;
    return jsonApi(
      request,
      { error, message: nsfwDenialMessage(error), ...mode, mode },
      { status: 403 }
    );
  }
  return jsonApi(request, mode);
}
