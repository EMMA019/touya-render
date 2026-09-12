import { ADS_OFF_ERROR, ADS_OFF_JA } from "@/lib/chat-mode";
import { REWARD_EXTRA_TURNS } from "@/lib/config";
import { jsonApi } from "@/lib/cors";
import { publicModeFromProfile } from "@/lib/mode-public";
import { checkRateLimit } from "@/lib/rate-limit";
import { grantReward } from "@/lib/usage";
import { getVisitorId } from "@/lib/visitor";
import { readVisitorProfile } from "@/lib/visitor-profile";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

/**
 * Stub: treat as an AdMob rewarded completion.
 * No account. Grants +N chats today, capped per JST day.
 * NSFW mode turns ads (including rewarded) fully off.
 */
export async function POST(request: Request) {
  const anonKey = await getVisitorId();
  if (!anonKey) {
    return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  }
  const mode = publicModeFromProfile(await readVisitorProfile(anonKey));
  if (!mode.adsEnabled) {
    return jsonApi(
      request,
      { error: ADS_OFF_ERROR, message: ADS_OFF_JA, ...mode, mode },
      { status: 403 }
    );
  }
  const pace = checkRateLimit(anonKey);
  if (pace !== "ok") {
    return jsonApi(request, { error: "cooldown", message: "少し間を置いてね。" }, { status: 429 });
  }
  const result = await grantReward(anonKey);
  if (!result.granted) {
    return jsonApi(
      request,
      {
        error: result.reason ?? "reward_cap",
        message: "今日のリワード枠は使い切りました。",
        extraPerWatch: REWARD_EXTRA_TURNS,
        ...result,
      },
      { status: 429 }
    );
  }
  return jsonApi(request, {
    ok: true,
    stub: true,
    provider: "admob",
    extraPerWatch: REWARD_EXTRA_TURNS,
    quota: result,
  });
}
