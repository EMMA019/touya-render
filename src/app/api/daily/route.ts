import { jsonApi } from "@/lib/cors";
import { emptyDailyCheckIn } from "@/lib/daily-checkin";
import { loadDailyPublic } from "@/lib/daily-load";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  const now = new Date();
  const daily = await loadDailyPublic(visitorId, now);
  if (!daily) {
    return jsonApi(request, { date: emptyDailyCheckIn(now).date, daily: null });
  }
  return jsonApi(request, daily);
}
