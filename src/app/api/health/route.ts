import { CHAT_MODES, DEFAULT_CHAT_MODE } from "@/lib/chat-mode";
import { debugUnlimitedEnabled, hasIrodoriTts, hasOpenRouterKey } from "@/lib/config";
import { jsonApi } from "@/lib/cors";
import { publicModeFromProfile } from "@/lib/mode-public";
import { getVisitorId } from "@/lib/visitor";
import { emptyVisitorProfile, readVisitorProfile } from "@/lib/visitor-profile";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  const profile = visitorId ? await readVisitorProfile(visitorId) : emptyVisitorProfile();
  const mode = publicModeFromProfile(profile);

  return jsonApi(request, {
    ok: true,
    app: "touya",
    debugUnlimited: debugUnlimitedEnabled(),
    defaultMode: DEFAULT_CHAT_MODE,
    chatModes: CHAT_MODES,
    backends: { sfw: "deepseek", nsfw: "openrouter" },
    openRouterConfigured: hasOpenRouterKey(),
    ttsConfigured: hasIrodoriTts(),
    tts: { configured: hasIrodoriTts() },
    ...mode,
    mode,
  });
}
