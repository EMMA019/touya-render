import { listCharacters } from "@/lib/characters";
import {
  NSFW_AGE_REQUIRED,
  NSFW_AGE_REQUIRED_JA,
  NSFW_RELATIONSHIP_REQUIRED,
  NSFW_RELATIONSHIP_REQUIRED_JA,
} from "@/lib/chat-mode";
import { nsfwRelationshipOk } from "@/lib/companion";
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
  return jsonApi(request, publicModeFromProfile(profile));
}

/**
 * Confirm 18+ and/or switch SFW ↔ NSFW.
 * NSFW is rejected unless age is already confirmed server-side
 * (or confirmAge is sent in the same request) AND the relationship with
 * `characterId` (or, if omitted, any character) has reached 特別.
 * `confirmAge: true` alone is always accepted.
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

  if (body.chatMode === "nsfw") {
    const roster = listCharacters().map((character) => character.id);
    const scope =
      typeof body.characterId === "string" && roster.includes(body.characterId) ? [body.characterId] : roster;
    if (!(await nsfwRelationshipOk(visitorId, scope))) {
      const profile = await applyVisitorModeChange(visitorId, { confirmAge: body.confirmAge === true });
      const mode = publicModeFromProfile(profile.profile);
      return jsonApi(
        request,
        { error: NSFW_RELATIONSHIP_REQUIRED, message: NSFW_RELATIONSHIP_REQUIRED_JA, ...mode, mode },
        { status: 403 }
      );
    }
  }

  const result = await applyVisitorModeChange(visitorId, {
    confirmAge: body.confirmAge === true,
    chatMode: body.chatMode,
  });
  const mode = publicModeFromProfile(result.profile);
  if (!result.ok) {
    return jsonApi(
      request,
      { error: NSFW_AGE_REQUIRED, message: NSFW_AGE_REQUIRED_JA, ...mode, mode },
      { status: 403 }
    );
  }
  return jsonApi(request, mode);
}
