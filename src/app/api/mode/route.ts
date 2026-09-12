import {
  NSFW_AGE_REQUIRED,
  NSFW_AGE_REQUIRED_JA,
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
  return jsonApi(request, publicModeFromProfile(profile));
}

/**
 * Confirm 18+ and/or switch SFW ↔ NSFW.
 * NSFW is rejected unless age is already confirmed server-side
 * (or confirmAge is sent in the same request).
 */
export async function POST(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) {
    return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  }

  let body: { confirmAge?: boolean; chatMode?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonApi(request, { error: "invalid_json" }, { status: 400 });
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
