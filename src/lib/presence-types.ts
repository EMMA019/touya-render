import type { BondStage } from "./bond-types";
import type { DayPart, Weekday } from "./clock";

export type TodayLine = {
  text: string;
  when?: DayPart | "any";
  weekday?: Weekday;
  month?: number;
  stage?: BondStage | "any";
};

export type CharacterPresence = {
  today: TodayLine[];
  hooks: string[];
  absences: {
    short: string[];
    few: string[];
    week: string[];
  };
  streaks: {
    three: string[];
    seven: string[];
  };
  suggestionsByStage?: Partial<Record<BondStage, string[]>>;
};

export type OpeningKind = "first" | "today" | "return" | "absence" | "hook" | "streak";

export type Opening = {
  kind: OpeningKind;
  text: string;
};
