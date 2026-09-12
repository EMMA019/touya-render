export const BOND_STAGES = ["first", "familiar", "regular"] as const;

export type BondStage = (typeof BOND_STAGES)[number];

export type Bond = {
  daysMet: number;
  factCount: number;
  stage: BondStage;
  lastDay: string | null;
  firstDay: string | null;
  streak: number;
  daysAway: number;
};

export const BOND_LINE: Record<BondStage, string> = {
  first: "相手とは初めて会う。距離は丁寧に。",
  familiar: "相手とは何度か会っている。顔なじみ。名前は自然に使ってよい。",
  regular: "相手とは何度も会っている。常連。名前や好みは自然に使う。覚えたことを復唱しない。",
};

export const BOND_LABEL: Record<BondStage, string> = {
  first: "初対面",
  familiar: "顔なじみ",
  regular: "常連",
};

export function resolveBondStage(daysMet: number, factCount: number): BondStage {
  if (daysMet >= 4 || factCount >= 3) return "regular";
  if (daysMet >= 2) return "familiar";
  return "first";
}

export const EMPTY_BOND: Bond = {
  daysMet: 0,
  factCount: 0,
  stage: "first",
  lastDay: null,
  firstDay: null,
  streak: 0,
  daysAway: 0,
};
