import { AffinityGauge } from "@/components/affinity-heart";
import Link from "next/link";
import { Moon } from "lucide-react";
import { formatBwh, type CharacterPublic } from "@/lib/character-types";
import { EMPTY_AFFINITY } from "@/lib/affinity-types";
import { readClock } from "@/lib/clock";
import { pickTodayLine } from "@/lib/presence";
import { situationIcon } from "@/lib/situation-icons";
import { cn } from "@/lib/utils";

export function CharacterPortalCard({
  character,
  rank,
  badge = "公式",
}: {
  character: CharacterPublic;
  rank?: number;
  badge?: string;
}) {
  const clock = readClock();
  const tonight = pickTodayLine(
    character.presence,
    clock,
    "first",
    `${character.id}:${clock.day}`
  );
  const heroImage = character.portraitImage || character.situations[0]?.image;
  const measurements = formatBwh(character.bwh);
  const affinity = character.affinity ?? EMPTY_AFFINITY;

  return (
    <Link
      href={`/c/${character.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#16101f] transition-all duration-300 hover:-translate-y-1 hover:border-amber-200/40 hover:shadow-[0_16px_36px_rgba(0,0,0,0.6)]"
      style={{
        boxShadow: `0 12px 28px -8px ${character.palette.glow}`,
      }}
    >
      {/* Visual aspect ratio: 3:4 portrait card */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/40">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={character.name}
            className="h-full w-full object-contain object-center transition duration-500"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(160deg, ${character.palette.from}, ${character.palette.to})`,
            }}
          />
        )}

        {/* Top badges (OzChat-like) */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-rose-300 backdrop-blur-md">
              {character.tone.split("/")[0]?.trim() || "今夜"}
            </span>
            <span className="flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-amber-100/90 backdrop-blur-md">
              <Moon className="size-2.5 text-amber-300" />
              <span>{character.job}</span>
            </span>
          </div>

          <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-200 border border-amber-400/30 backdrop-blur-md">
            {badge}
          </span>
        </div>

        {/* Dark gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#120a16] via-[#120a16]/40 to-transparent" />

        {/* Card Overlay Info */}
        <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-amber-50 group-hover:text-amber-200 transition-colors">
              {character.name}
            </h3>
            <span className="text-[10px] text-amber-200/50">{character.reading}</span>
          </div>
          {measurements ? (
            <p className="text-[11px] tabular-nums tracking-wide text-amber-100/70">{measurements}</p>
          ) : null}
          <AffinityGauge affinity={affinity} />

          {/* Tonight's line teaser */}
          <p className="line-clamp-2 text-xs leading-snug text-amber-100/80">
            「{tonight ?? character.greeting}」
          </p>

          {/* Situation chips */}
          <div className="mt-1 flex flex-wrap gap-1">
            {character.situations.slice(0, 2).map((scene) => {
              const Icon = situationIcon(scene.id, scene.season, scene.costume);
              return (
                <span
                  key={scene.id}
                  className="inline-flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-amber-100/60"
                >
                  <Icon className="size-2.5 opacity-80" />
                  {scene.title}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </Link>
  );
}
