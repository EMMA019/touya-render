import type { CharacterPublic, PortraitHints, SituationPublic } from "@/lib/character-types";
import type { Expression } from "@/lib/expression";
import { hasFinishedSituationArt } from "@/lib/situation-shelf";
import { cn } from "@/lib/utils";

const MOUTH: Record<Expression, string> = {
  neutral: "M180 274c8 8 24 8 32 0",
  smile: "M176 272c10 12 28 12 38 0",
  troubled: "M184 278c8-6 16-6 24 0",
};

/** Close-up clothed portrait. Character-only art: no name tags or baked-in text. */
export function PortraitStage({
  character,
  situation,
  expression = "neutral",
  className,
}: {
  character: CharacterPublic;
  situation?: SituationPublic;
  expression?: Expression;
  className?: string;
}) {
  const costume = situation?.costume ?? (situation?.season === "halloween" ? "halloween" : undefined);
  const halloween = costume === "halloween";
  const uid = `${character.id}-${situation?.id ?? "base"}`;
  const look = outfit(character, costume);
  const art =
    (situation && hasFinishedSituationArt(situation) ? situation.image : null) ||
    character.portraitImage ||
    situation?.image;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={art}
          alt=""
          className={cn(
            "h-full w-full object-contain object-center transition duration-500",
            expression === "smile" && "brightness-110",
            expression === "troubled" && "saturate-75 contrast-110"
          )}
        />
      ) : (
        <svg
          viewBox="0 0 390 844"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={halloween ? "#1c0c18" : look.skyTop} />
              <stop offset="40%" stopColor={halloween ? "#4a1c20" : look.skyMid} />
              <stop offset="100%" stopColor={halloween ? "#12080c" : look.skyBot} />
            </linearGradient>
            <radialGradient id={`glow-${uid}`} cx="50%" cy="22%" r="48%">
              <stop
                offset="0%"
                stopColor={halloween ? "#f0a040" : character.palette.accent}
                stopOpacity={halloween ? "0.42" : "0.22"}
              />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="390" height="844" fill={`url(#sky-${uid})`} />
          <rect width="390" height="844" fill={`url(#glow-${uid})`} />

          {halloween ? <HalloweenSet /> : <QuietLights color={character.palette.accent} />}

          {/* Hair behind — wide, fills the top of the phone */}
          <path d={look.hairBack} fill={character.palette.hair} />

          {/* Neck + high/crew collar + long-sleeve dress that covers the torso */}
          <path d="M168 318c6 46 14 70 28 70s22-24 28-70" fill="#e8b8a8" />
          <path d={look.collar} fill={look.collarFill} />
          {look.cape ? <path d={look.cape} fill={look.capeFill} /> : null}
          <path d={look.bodice} fill={look.dressFill} />
          <path d={look.skirt} fill={look.skirtFill} />
          <path d={look.leftSleeve} fill={look.sleeveFill} />
          <path d={look.rightSleeve} fill={look.sleeveFill} />
          <path d={look.leftHand} fill="#e8b8a8" />
          <path d={look.rightHand} fill="#e8b8a8" />

          {/* Head — large, upper third */}
          <ellipse cx="196" cy="236" rx="62" ry="78" fill="#f3c8b8" />
          <path d={look.bangs} fill={character.palette.hair} />
          <path d={look.sideHair} fill={character.palette.hair} />
          <ellipse cx="172" cy={expression === "troubled" ? 246 : 242} rx="5" ry={expression === "smile" ? 7 : 6} fill="#2a1c18" />
          <ellipse cx="220" cy={expression === "troubled" ? 246 : 242} rx="5" ry={expression === "smile" ? 7 : 6} fill="#2a1c18" />
          <path
            d={MOUTH[expression]}
            fill="none"
            stroke="#c47a6a"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {look.choker ? (
            <rect x="174" y="318" width="44" height="5" rx="2.5" fill="#1a1014" />
          ) : null}

          {halloween && look.hat ? (
            <g>
              <ellipse cx="196" cy="168" rx="92" ry="14" fill="#1a1224" />
              <path d={look.hat} fill="#1a1224" />
              <path d="M186 86h20v22h-20z" fill="#3a2810" />
              {look.hatBand ? <path d={look.hatBand} fill="#e08a2a" /> : null}
            </g>
          ) : null}

          {halloween && look.mask ? <path d={look.mask} fill="#2a1828" /> : null}
        </svg>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/70" />
      {halloween && !situation?.image ? <HalloweenOverlay halloween={character.portrait?.halloween} /> : null}
    </div>
  );
}

function QuietLights({ color }: { color: string }) {
  return (
    <g opacity="0.5">
      <circle cx="46" cy="90" r="3" fill={color} />
      <circle cx="344" cy="72" r="2.4" fill="#fff6e8" />
      <circle cx="64" cy="168" r="1.8" fill="#fff6e8" />
    </g>
  );
}

function HalloweenOverlay({ halloween }: { halloween?: PortraitHints["halloween"] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {halloween === "mask" ? (
        <div className="absolute top-[46%] right-[8%] h-10 w-16 rounded-[40%] border-2 border-amber-200/80 bg-black/55" />
      ) : (
        <div className="absolute top-[7%] left-1/2 w-44 -translate-x-1/2">
          <div className="mx-auto h-8 w-2 bg-amber-800" />
          <div className="mx-auto -mt-1 h-14 w-20 bg-[#1a1224] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
          <div className="mx-auto h-2.5 w-36 rounded-full bg-[#1a1224]" />
          <div className="mx-auto h-1.5 w-28 bg-orange-400" />
        </div>
      )}
      <div className="absolute top-[42%] left-1 size-[4.5rem] rounded-full bg-orange-500 shadow-[0_0_24px_#f0a040]">
        <div className="absolute inset-3 rounded-full bg-[#2a1408]" />
      </div>
      <div className="absolute top-[46%] right-1 size-14 rounded-full bg-amber-400 shadow-[0_0_20px_#f6c070]">
        <div className="absolute inset-2.5 rounded-full bg-[#2a1408]" />
      </div>
    </div>
  );
}

function HalloweenSet() {
  return (
    <g>
      <circle cx="54" cy="720" r="46" fill="#e08a2a" />
      <circle cx="54" cy="720" r="28" fill="#2a1408" />
      <polygon points="40,712 48,728 32,728" fill="#f0c060" />
      <polygon points="68,712 76,728 60,728" fill="#f0c060" />
      <rect x="48" y="668" width="12" height="16" rx="2" fill="#3a2810" />
      <circle cx="336" cy="700" r="38" fill="#f0a040" />
      <circle cx="336" cy="700" r="22" fill="#2a1408" />
      <polygon points="324,694 332,706 316,706" fill="#f6d080" />
      <circle cx="48" cy="120" r="4" fill="#f0a040" />
      <circle cx="350" cy="148" r="3.2" fill="#f6c070" />
      <circle cx="80" cy="200" r="2.4" fill="#ffb040" />
    </g>
  );
}

type Outfit = {
  skyTop: string;
  skyMid: string;
  skyBot: string;
  hairBack: string;
  bangs: string;
  sideHair: string;
  collar: string;
  collarFill: string;
  bodice: string;
  dressFill: string;
  skirt: string;
  skirtFill: string;
  leftSleeve: string;
  rightSleeve: string;
  sleeveFill: string;
  leftHand: string;
  rightHand: string;
  choker: boolean;
  cape?: string;
  capeFill?: string;
  hat?: string;
  hatBand?: string;
  mask?: string;
};

const HAIR_BACK_LONG =
  "M78 280c16-170 48-250 118-250s102 80 118 250c10 120-20 280-118 300S68 400 78 280Z";
const HAIR_BACK_SILVER =
  "M96 300c14-150 40-220 100-220s86 70 100 220c6 80-16 160-100 170S90 380 96 300Z";
const BANGS = "M134 210c12-78 30-108 62-108s50 30 62 108c-18-22-40-32-62-32s-44 10-62 32Z";
const SIDE_HAIR =
  "M128 250c-10 50-8 110 6 160 10-40 14-90 8-150Zm134 0c10 50 8 110-6 160-10-40-14-90-8-150Z";
const BODICE =
  "M78 360c18-20 52-32 118-32s100 12 118 32c14 70 8 150-10 230H88c-18-80-24-160-10-230Z";
const SKIRT = "M70 580c30 16 70 24 126 24s96-8 126-24c8 90 4 180-8 240H78c-12-60-16-150-8-240Z";
const LEFT_SLEEVE = "M78 372c-36 40-54 100-56 160-2 22 16 28 26 16 14-34 24-90 30-150Z";
const RIGHT_SLEEVE = "M312 372c36 40 54 100 56 160 2 22-16 28-26 16-14-34-24-90-30-150Z";
const LEFT_HAND = "M18 528c2 16 16 24 28 20 8-4 10-16 6-24-12-4-24-4-34 4Z";
const RIGHT_HAND = "M372 528c-2 16-16 24-28 20-8-4-10-16-6-24 12-4 24-4 34 4Z";
const COLLAR = "M156 348c12 16 28 22 40 22s28-6 40-22c-12 8-26 12-40 12s-28-4-40-12Z";

function outfit(character: CharacterPublic, costume?: string): Outfit {
  const hint = character.portrait ?? {};
  const hairBack = hint.hair === "shoulder" ? HAIR_BACK_SILVER : HAIR_BACK_LONG;
  const daily = dailyColors(character);
  const halloweenKind = hint.halloween ?? "hat";
  const base = {
    ...daily,
    hairBack,
    bangs: BANGS,
    sideHair: SIDE_HAIR,
    collar: COLLAR,
    bodice: BODICE,
    skirt: SKIRT,
    leftSleeve: LEFT_SLEEVE,
    rightSleeve: RIGHT_SLEEVE,
    leftHand: LEFT_HAND,
    rightHand: RIGHT_HAND,
  };

  if (costume === "maid") {
    return { ...base, dressFill: "#1a1214", skirtFill: "#0e0a0c", sleeveFill: "#1a1214", collarFill: "#f4eee8" };
  }
  if (costume === "nurse") {
    return { ...base, skyTop: "#e8f0f4", skyMid: "#9ab0c0", dressFill: "#f4f7fa", skirtFill: "#2a3a4a", sleeveFill: "#eef3f6", collarFill: "#d0d8e0", choker: false };
  }
  if (costume === "miko") {
    return { ...base, skyTop: "#2a1810", skyMid: "#c45a48", dressFill: "#f4eee8", skirtFill: "#b42828", sleeveFill: "#f4eee8", collarFill: "#f8f2ea", choker: false };
  }
  if (costume === "idol") {
    return { ...base, skyTop: "#1a1028", skyMid: "#c45a9a", dressFill: "#f4b8d0", skirtFill: "#1a1020", sleeveFill: "#f8d0e0", collarFill: "#fff4f8", choker: false };
  }
  if (costume !== "halloween") {
    return base;
  }

  return {
    skyTop: "#1c0c18",
    skyMid: "#4a1c20",
    skyBot: "#12080c",
    hairBack,
    bangs: BANGS,
    sideHair: SIDE_HAIR,
    collar: COLLAR,
    collarFill: halloweenKind === "cape" ? "#f2e4dc" : "#2a1820",
    bodice: BODICE,
    dressFill: halloweenKind === "mask" ? "#4a2840" : "#1a1220",
    skirt: SKIRT,
    skirtFill: "#141018",
    leftSleeve: LEFT_SLEEVE,
    rightSleeve: RIGHT_SLEEVE,
    sleeveFill: halloweenKind === "cape" ? "#f6eee8" : "#1c141c",
    leftHand: LEFT_HAND,
    rightHand: halloweenKind === "mask" ? "M330 500c16-10 40-6 48 10-14 16-34 18-48 10-6-4-6-14 0-20Z" : RIGHT_HAND,
    choker: hint.choker ?? false,
    cape:
      halloweenKind === "cape"
        ? "M110 340c-70 30-90 110-80 190 40-30 60-90 70-150 6-14 10-28 10-40Zm170 0c70 30 90 110 80 190-40-30-60-90-70-150-6-14-10-28-10-40Z"
        : undefined,
    capeFill: "#4a1020",
    hat:
      halloweenKind === "mask"
        ? undefined
        : "M118 168h156c-20-12-48-18-78-18s-58 6-78 18Zm58-6 20-78 20 78c-12-8-28-8-40 0Z",
    hatBand: halloweenKind === "mask" ? undefined : "M130 166h132v8H130z",
    mask: halloweenKind === "mask" ? "M328 496c16-14 46-12 56 6-12 14-36 20-56 12-8-4-8-12 0-18Z" : undefined,
  };
}

function dailyColors(character: CharacterPublic) {
  const p = character.palette;
  const hint = character.portrait ?? {};
  return {
    skyTop: p.from,
    skyMid: p.to,
    skyBot: hint.skyBot ?? "#100808",
    collarFill: hint.collar ?? p.accent,
    dressFill: hint.dress ?? p.to,
    skirtFill: hint.skirt ?? p.from,
    sleeveFill: hint.sleeve ?? p.accent,
    choker: hint.choker ?? false,
  };
}
