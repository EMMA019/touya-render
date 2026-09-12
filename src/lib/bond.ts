import type { CharacterId } from "./character-types";
import { daysBetween, streakEndingOn } from "./clock";
import { BOND_STORE_FILENAME, jstDayKey } from "./config";
import { createJsonStore } from "./json-store";
import { resolveBondStage, type Bond } from "./bond-types";

export {
  BOND_LABEL,
  BOND_LINE,
  BOND_STAGES,
  EMPTY_BOND,
  resolveBondStage,
  type Bond,
  type BondStage,
} from "./bond-types";

type PairRecord = { days: string[]; lastDay: string | null; firstDay: string | null };
type StoreShape = { pairs: Record<string, PairRecord> };

const store = createJsonStore<StoreShape>({
  envKey: "BOND_STORE_PATH",
  filename: BOND_STORE_FILENAME,
  empty: () => ({ pairs: {} }),
});

function pairKey(visitorId: string, characterId: CharacterId): string {
  return `${visitorId}:${characterId}`;
}

function toBond(
  record: PairRecord | undefined,
  factCount: number,
  today: string,
  daysAway: number
): Bond {
  const days = record?.days ?? [];
  return {
    daysMet: days.length,
    factCount,
    stage: resolveBondStage(days.length, factCount),
    lastDay: record?.lastDay ?? null,
    firstDay: record?.firstDay ?? null,
    streak: streakEndingOn(days, today),
    daysAway,
  };
}

export async function readBond(
  visitorId: string,
  characterId: CharacterId,
  factCount = 0,
  now = new Date()
): Promise<Bond> {
  const today = jstDayKey(now);
  return store.enqueue(async () => {
    const data = await store.read();
    const record = data.pairs[pairKey(visitorId, characterId)];
    const daysAway = record?.lastDay ? daysBetween(record.lastDay, today) : 0;
    return toBond(record, factCount, today, Math.max(0, daysAway));
  });
}

export async function touchBond(
  visitorId: string,
  characterId: CharacterId,
  factCount = 0,
  now = new Date()
): Promise<Bond> {
  const day = jstDayKey(now);
  return store.enqueue(async () => {
    const data = await store.read();
    const key = pairKey(visitorId, characterId);
    const current = data.pairs[key] ?? { days: [], lastDay: null, firstDay: null };
    const daysAway = current.lastDay ? Math.max(0, daysBetween(current.lastDay, day)) : 0;
    const days = current.days.includes(day) ? current.days : [...current.days, day].slice(-60);
    const next: PairRecord = {
      days,
      lastDay: day,
      firstDay: current.firstDay ?? day,
    };
    data.pairs[key] = next;
    await store.persist(data);
    return toBond(next, factCount, day, daysAway);
  });
}

export function resetBondStore() {
  store.resetMemory();
}
