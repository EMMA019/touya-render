import { CHAT_MODES, DEFAULT_CHAT_MODE } from "@/lib/chat-mode";
import { debugUnlimitedEnabled, hasOpenRouterKey } from "@/lib/config";
import { publicModeFromProfile } from "@/lib/mode-public";
import { getVisitorId } from "@/lib/visitor";
import { emptyVisitorProfile, readVisitorProfile } from "@/lib/visitor-profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const visitorId = await getVisitorId();
  const profile = visitorId ? await readVisitorProfile(visitorId) : emptyVisitorProfile();
  const mode = publicModeFromProfile(profile);

  return Response.json({
    ok: true,
    app: "touya",
    debugUnlimited: debugUnlimitedEnabled(),
    defaultMode: DEFAULT_CHAT_MODE,
    chatModes: CHAT_MODES,
    backends: { sfw: "deepseek", nsfw: "openrouter" },
    openRouterConfigured: hasOpenRouterKey(),
    ...mode,
    mode,
  });
}
