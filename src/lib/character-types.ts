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
  /** Optional looping situation card video (Oz-style). PNG `image` stays required. */
  video?: string | null;
  season?: SituationSeason;
  costume?: SituationCostume;
  greeting?: string;
  lines?: SituationLine[];
  minLevel?: number;
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

export function situationMediaPath(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const path = value.trim();
  return path || null;
}

export function toPublicSituation(scene: CharacterSituation): SituationPublic {
  const video = situationMediaPath(scene.video);
  return {
    id: scene.id,
    title: scene.title,
    image: scene.image ?? null,
    ...(video ? { video } : {}),
    season: scene.season,
    costume: scene.costume,
    greeting: scene.greeting,
    minLevel: situationMinLevel(scene),
    lines: Array.isArray(scene.lines)
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
