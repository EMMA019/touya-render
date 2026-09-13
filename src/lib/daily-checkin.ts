import { DAILY_STORE_FILENAME, jstDayKey } from "./config";
import { createJsonStore } from "./json-store";

type StoreShape = { visitors: Record<string, string> };

const store = createJsonStore<StoreShape>({
  envKey: "DAILY_STORE_PATH",
  filename: DAILY_STORE_FILENAME,
  empty: () => ({ visitors: {} }),
});

export type DailyCheckIn = {
  date: string;
  checkedIn: boolean;
  firstToday: boolean;
};

export function emptyDailyCheckIn(now = new Date()): DailyCheckIn {
  return { date: jstDayKey(now), checkedIn: false, firstToday: false };
}

/** Mark this JST calendar day as visited. No currency, gifts, or streak rewards. */
export async function touchDailyCheckIn(visitorId: string, now = new Date()): Promise<DailyCheckIn> {
  const date = jstDayKey(now);
  return store.enqueue(async () => {
    const data = await store.read();
    const firstToday = data.visitors[visitorId] !== date;
    if (firstToday) {
      data.visitors[visitorId] = date;
      await store.persist(data);
    }
    return { date, checkedIn: true, firstToday };
  });
}

export function resetDailyCheckInStore() {
  store.resetMemory();
}
