import "server-only";
import { listPublicCharactersForVisitor } from "./characters";
import { emptyDailyCheckIn, touchDailyCheckIn } from "./daily-checkin";
import { pickDailyFromRoster, type DailyPublic } from "./daily";

export async function loadDailyPublic(
  visitorId: string | null,
  now = new Date(),
): Promise<DailyPublic | null> {
  const roster = await listPublicCharactersForVisitor(visitorId);
  const pick = pickDailyFromRoster(roster, visitorId, now);
  if (!pick) return null;
  const checkIn = visitorId ? await touchDailyCheckIn(visitorId, now) : emptyDailyCheckIn(now);
  return { ...pick, ...checkIn };
}
