import { QUOTA_TIMEZONE, jstDayKey } from "./config";

export const DAY_PARTS = ["dawn", "morning", "afternoon", "evening", "night"] as const;
export type DayPart = (typeof DAY_PARTS)[number];

export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type Clock = {
  day: string;
  hour: number;
  month: number;
  weekday: Weekday;
  part: DayPart;
};

export function jstHour(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: QUOTA_TIMEZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now)
  );
}

export function jstWeekday(now = new Date()): Weekday {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: QUOTA_TIMEZONE,
    weekday: "short",
  }).format(now);
  const map: Record<string, Weekday> = {
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
  };
  return map[name] ?? "sun";
}

export function jstMonth(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: QUOTA_TIMEZONE,
      month: "numeric",
    }).format(now)
  );
}

export function dayPart(hour: number): DayPart {
  if (hour < 5) return "night";
  if (hour < 9) return "dawn";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export function readClock(now = new Date()): Clock {
  const hour = jstHour(now);
  return {
    day: jstDayKey(now),
    hour,
    month: jstMonth(now),
    weekday: jstWeekday(now),
    part: dayPart(hour),
  };
}

export function shiftDayKey(day: string, delta: number): string {
  const utc = Date.parse(`${day}T00:00:00+09:00`);
  return jstDayKey(new Date(utc + delta * 86_400_000));
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00+09:00`);
  const b = Date.parse(`${to}T00:00:00+09:00`);
  return Math.round((b - a) / 86_400_000);
}

export function streakEndingOn(days: string[], end: string): number {
  const set = new Set(days);
  let count = 0;
  let cursor = end;
  while (set.has(cursor)) {
    count += 1;
    cursor = shiftDayKey(cursor, -1);
    if (count > 60) break;
  }
  return count;
}

export function hashPick(seed: string, length: number): number {
  if (length <= 0) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 33 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % length;
}
