import { FREE_DAILY_TURNS, REWARD_EXTRA_TURNS, REWARD_MAX_PER_DAY, debugUnlimitedEnabled } from "@/lib/config";
import { jsonApi } from "@/lib/cors";
import { emptyQuota, readQuota } from "@/lib/usage";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

/** Bootstrap quota only. Never returns the raw or hashed install id. */
export async function GET(request: Request) {
  const anonKey = await getVisitorId();
  const quota = anonKey ? await readQuota(anonKey) : emptyQuota();

  return jsonApi(request, {
    anonymous: true,
    collectsPii: false,
    quota,
    debugUnlimited: quota.debugUnlimited === true || debugUnlimitedEnabled(),
    dailyLimit: quota.premium ? quota.limit - quota.extra : FREE_DAILY_TURNS,
    reward: {
      extraPerWatch: REWARD_EXTRA_TURNS,
      maxPerDay: REWARD_MAX_PER_DAY,
    },
  });
}
