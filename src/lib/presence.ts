import type { BondStage } from "./bond-types";
import { hashPick, type Clock } from "./clock";
import type { CharacterPresence, Opening, TodayLine } from "./presence-types";

export type { CharacterPresence, Opening, OpeningKind, TodayLine } from "./presence-types";

function matches(line: TodayLine, clock: Clock, stage: BondStage): boolean {
  if (line.when && line.when !== "any" && line.when !== clock.part) return false;
  if (line.weekday && line.weekday !== clock.weekday) return false;
  if (line.month && line.month !== clock.month) return false;
  if (line.stage && line.stage !== "any" && line.stage !== stage) return false;
  return true;
}

function specificity(line: TodayLine): number {
  return (
    (line.when && line.when !== "any" ? 2 : 0) +
    (line.weekday ? 2 : 0) +
    (line.month ? 2 : 0) +
    (line.stage && line.stage !== "any" ? 1 : 0)
  );
}

export function pickTodayLine(
  presence: CharacterPresence | undefined,
  clock: Clock,
  stage: BondStage,
  seed: string
): string | null {
  const pool = (presence?.today ?? []).filter((line) => matches(line, clock, stage));
  if (pool.length === 0) return presence?.today?.[0]?.text ?? null;
  const best = Math.max(...pool.map(specificity));
  const tight = pool.filter((line) => specificity(line) === best);
  return tight[hashPick(seed, tight.length)]?.text ?? tight[0].text;
}

export function pickFrom(list: string[] | undefined, seed: string, fallback: string): string {
  if (!list || list.length === 0) return fallback;
  return list[hashPick(seed, list.length)] ?? fallback;
}

export function pickAbsence(presence: CharacterPresence | undefined, daysAway: number, seed: string, fallback: string) {
  if (daysAway >= 7) return pickFrom(presence?.absences.week, seed, fallback);
  if (daysAway >= 3) return pickFrom(presence?.absences.few, seed, fallback);
  return pickFrom(presence?.absences.short, seed, fallback);
}

export function composeOpening(args: {
  id: string;
  greeting: string;
  welcomeBack: string;
  presence?: CharacterPresence;
  clock: Clock;
  stage: BondStage;
  daysAway: number;
  streak: number;
  hook?: string | null;
  firstVisit: boolean;
}): Opening {
  const seed = `${args.id}:${args.clock.day}`;
  const today =
    pickTodayLine(args.presence, args.clock, args.stage, seed) ??
    (args.firstVisit ? args.greeting : args.welcomeBack);

  if (args.firstVisit) {
    return {
      kind: "first",
      text: today === args.greeting ? args.greeting : `${args.greeting}\n${today}`,
    };
  }

  if (args.daysAway >= 2) {
    const noticed = pickAbsence(args.presence, args.daysAway, seed, args.welcomeBack);
    return { kind: "absence", text: `${noticed}\n${today}` };
  }

  if (args.hook) {
    return { kind: "hook", text: `${args.welcomeBack}\n昨日の続き、覚えてる。${args.hook}\n${today}` };
  }

  if (args.streak >= 7) {
    const line = pickFrom(args.presence?.streaks.seven, seed, today);
    return { kind: "streak", text: `${line}\n${today}` };
  }
  if (args.streak >= 3) {
    const line = pickFrom(args.presence?.streaks.three, seed, today);
    return { kind: "streak", text: `${line}\n${today}` };
  }

  if (args.daysAway >= 1) {
    return { kind: "return", text: today };
  }

  return { kind: "today", text: today };
}

export function suggestionsFor(
  presence: CharacterPresence | undefined,
  stage: BondStage,
  fallback: string[]
): string[] {
  const staged = presence?.suggestionsByStage?.[stage];
  return staged && staged.length > 0 ? staged : fallback;
}

export function pickHook(presence: CharacterPresence | undefined, seed: string, fallback: string): string {
  return pickFrom(presence?.hooks, seed, fallback);
}
