import { listPublicCharactersForVisitor } from "@/lib/characters";
import { jsonApi } from "@/lib/cors";
import { emptyDailyCheckIn, touchDailyCheckIn } from "@/lib/daily-checkin";
import { pickDailyFromRoster } from "@/lib/daily";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  const now = new Date();
  const characters = await listPublicCharactersForVisitor(visitorId);
  const pick = pickDailyFromRoster(characters, visitorId, now);
  const checkIn = visitorId ? await touchDailyCheckIn(visitorId, now) : emptyDailyCheckIn(now);
  return jsonApi(request, { characters, daily: pick ? { ...pick, ...checkIn } : null });
}