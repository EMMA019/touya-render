import type { CharacterPublic } from "@/lib/character-types";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE: Record<Size, string> = {
  sm: "size-9",
  md: "size-14",
  lg: "size-24",
  xl: "size-40",
};

export function CharacterAvatar({
  character,
  size = "md",
  className,
}: {
  character: CharacterPublic;
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[1.4rem] ring-2 ring-rose-100/20",
        SIZE[size],
        className
      )}
      style={{
        background: `linear-gradient(160deg, ${character.palette.from}, ${character.palette.to})`,
        boxShadow: `0 0 24px ${character.palette.glow}`,
      }}
      aria-hidden
    >
      {character.portraitImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={character.portraitImage} alt="" className="h-full w-full object-cover object-[center_20%]" />
      ) : (
      <svg viewBox="0 0 80 80" className="h-full w-full">
        <ellipse cx="40" cy="86" rx="28" ry="18" fill={character.palette.from} opacity="0.55" />
        <path
          d="M20 58c2-4 8-8 20-8s18 4 20 8c2 8-8 16-20 16S18 66 20 58Z"
          fill={character.palette.to}
          opacity="0.85"
        />
        <path
          d="M18 44c2-18 12-28 22-28s20 10 22 28c0 10-6 18-22 18S18 54 18 44Z"
          fill="#f6d4c6"
        />
        <path
          d="M16 38c3-20 14-30 24-30s21 10 24 30c-6-8-14-10-24-10s-18 2-24 10Z"
          fill={character.palette.hair}
        />
        <path
          d="M20 42c8 6 32 6 40 0"
          fill="none"
          stroke={character.palette.hair}
          strokeWidth="10"
          opacity="0.9"
        />
        <circle cx="31" cy="46" r="2.2" fill="#2a1c18" />
        <circle cx="49" cy="46" r="2.2" fill="#2a1c18" />
        <path
          d="M36 54c2.4 2 5.6 2 8 0"
          fill="none"
          stroke="#c47a6a"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="40" cy="18" r="2.4" fill={character.palette.accent} />
      </svg>
      )}
    </div>
  );
}
