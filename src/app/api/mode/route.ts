import {
  NSFW_AGE_REQUIRED,
  NSFW_AGE_REQUIRED_JA,
} from "@/lib/chat-mode";
import { publicModeFromProfile } from "@/lib/mode-public";
import { getVisitorId } from "@/lib/visitor";
import {
  applyVisitorModeChange,
  emptyVisitorProfile,
  readVisitorProfile,
} from "@/lib/visitor-profile";

export const dynamic = "force-dynamic";

/** Current mode + age confirmation. Never returns the install id. */
export async function GET() {
  const visitorId = await getVisitorId();
  const profile = visitorId ? await readVisitorProfile(visitorId) : emptyVisitorProfile();
  return Response.json(publicModeFromProfile(profile));
}

/**
 * Confirm 18+ and/or switch SFW ↔ NSFW.
 * NSFW is rejected unless age is already confirmed server-side
 * (or confirmAge is sent in the same request).
 */
export async function POST(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) {
    return Response.json({ error: "visitor_missing" }, { status: 400 });
  }

  let body: { confirmAge?: boolean; chatMode?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await applyVisitorModeChange(visitorId, {
    confirmAge: body.confirmAge === true,
    chatMode: body.chatMode,
  });
  const mode = publicModeFromProfile(result.profile);
  if (!result.ok) {
    return Response.json(
      { error: NSFW_AGE_REQUIRED, message: NSFW_AGE_REQUIRED_JA, ...mode, mode },
      { status: 403 }
    );
  }
  return Response.json(mode);
}
