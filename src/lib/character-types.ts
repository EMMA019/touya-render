import type { CharacterPresence } from "./presence-types";
import type { AffinityPublic } from "./affinity-types";

export type CharacterId = string;

export const ART_STYLES = ["anime", "photoreal"] as const;

export type ArtStyle = (typeof ART_STYLES)[number];

export const ART_STYLE_LABEL: Record<ArtStyle, string> = {
  anime: "アニメ",
  photoreal: "写実",
};

export function resolveArtStyle(value?: string | null): ArtStyle {
  return value === "photoreal" ? "photoreal" : "anime";
}

export const REFUSAL_STYLES = ["amae", "tsun", "cool", "gentle", "elegant"] as const;

export type RefusalStyle = (typeof REFUSAL_STYLES)[number];

export type SituationSeason = string;

export type SituationCostume = string;

export type SituationLine = string | { text: string; minLevel?: number };

export type SituationPublic = {
  id: string;
  title: string;
  image?: string | null;
  season?: SituationSeason;
  costume?: SituationCostume;
  greeting?: string;
  lines?: SituationLine[];
  minLevel?: number;
  nsfwOnly?: boolean;
};

export type CharacterSituation = SituationPublic & {
  setting: string;
  look: string;
};

export function situationLineText(line: SituationLine | undefined): string {
  if (typeof line === "string") return line.trim();
  if (line && typeof line === "object") return String(line.text ?? "").trim();
  return "";
}

export function situationLineMinLevel(line: SituationLine | undefined): number {
  if (line && typeof line === "object" && Number.isInteger(line.minLevel)) {
    return Math.min(3, Math.max(0, line.minLevel ?? 0));
  }
  return 0;
}

export function situationMinLevel(scene?: Pick<SituationPublic, "minLevel"> | null): number {
  const raw = scene?.minLevel;
  if (!Number.isInteger(raw)) return 0;
  return Math.min(3, Math.max(0, raw ?? 0));
}

export function situationGreeting(
  situation?: Pick<SituationPublic, "greeting"> | null,
  fallback = "",
): string {
  const line = situation?.greeting?.trim();
  return line || fallback;
}

export function situationNsfwOnly(scene?: { nsfwOnly?: boolean } | null): boolean {
  return scene?.nsfwOnly === true;
}

export function toPublicSituation(
  scene: CharacterSituation,
  access?: { nsfwAllowed?: boolean },
): SituationPublic {
  const nsfwOnly = situationNsfwOnly(scene);
  const revealIntimate = !nsfwOnly || access?.nsfwAllowed === true;
  return {
    id: scene.id,
    title: revealIntimate ? scene.title : "特別な時間",
    image: revealIntimate ? scene.image ?? null : null,
    season: scene.season,
    costume: scene.costume,
    greeting: revealIntimate ? scene.greeting : undefined,
    minLevel: nsfwOnly ? Math.max(situationMinLevel(scene), 2) : situationMinLevel(scene),
    nsfwOnly: nsfwOnly || undefined,
    lines: revealIntimate && Array.isArray(scene.lines)
      ? scene.lines.filter((line) => situationLineText(line).length > 0).slice(0, 3)
      : undefined,
  };
}

/** Visual hints for the placeholder portrait. Optional — images are enough. */
export type PortraitHints = {
  hair?: "long" | "shoulder";
  halloween?: "hat" | "mask" | "cape";
  choker?: boolean;
  dress?: string;
  skirt?: string;
  sleeve?: string;
  collar?: string;
  skyBot?: string;
};

export type CharacterPublic = {
  id: CharacterId;
  name: string;
  reading: string;
  job: string;
  tagline: string;
  greeting: string;
  welcomeBack: string;
  farewell: string;
  offline: string;
  tone: string;
  artStyle: ArtStyle;
  suggestions: string[];
  situations: SituationPublic[];
  palette: {
    from: string;
    to: string;
    glow: string;
    hair: string;
    accent: string;
  };
  portrait?: PortraitHints;
  portraitImage?: string | null;
  presence?: CharacterPresence;
  bwh?: CharacterBwh;
  affinity?: AffinityPublic;
  nsfwUnlocked?: boolean;
};

export type CharacterBwh = {
  bust: number;
  waist: number;
  hip: number;
};

export function formatBwh(bwh?: CharacterBwh | null): string | null {
  if (
    !bwh ||
    !Number.isFinite(bwh.bust) ||
    !Number.isFinite(bwh.waist) ||
    !Number.isFinite(bwh.hip)
  ) {
    return null;
  }
  return `B${bwh.bust} / W${bwh.waist} / H${bwh.hip}`;
}

export type CharacterBible = {
  name: string;
  job: string;
  setting: string;
  personality: string[];
  never: string[];
  bwh?: CharacterBwh;
};

export type Character = Omit<CharacterPublic, "situations" | "bwh" | "affinity"> & {
  situations: CharacterSituation[];
  systemPrompt: string;
  refusalStyle: RefusalStyle;
  bible: CharacterBible;
  demoReplies?: string[];
  order?: number;
};

export const CHARACTER_ID = /^[a-z][a-z0-9-]{1,24}$/;
