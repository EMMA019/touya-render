import Link from "next/link";
import { CharacterAvatar } from "@/components/character-avatar";
import { SituationPortrait } from "@/components/situation-portrait";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBwh, type CharacterPublic } from "@/lib/character-types";
import { readClock } from "@/lib/clock";
import { pickTodayLine } from "@/lib/presence";
import { situationIcon } from "@/lib/situation-icons";
import { cn } from "@/lib/utils";

export function CharacterCard({ character }: { character: CharacterPublic }) {
  const clock = readClock();
  const tonight = pickTodayLine(character.presence, clock, "first", `${character.id}:${clock.day}`);
  const measurements = formatBwh(character.bwh);
  return (
    <Card
      className="overflow-hidden border-white/10 bg-white/5 text-amber-50 shadow-none ring-white/10 backdrop-blur-md"
      style={{ boxShadow: `0 16px 40px ${character.palette.glow}` }}
    >
      <SituationPortrait character={character} className="rounded-none border-0" />
      <CardHeader className="gap-3">
        <div className="flex items-start gap-4">
          <CharacterAvatar character={character} size="lg" />
          <div className="min-w-0 space-y-1">
            <Badge variant="outline" className="border-white/15 text-amber-100/80">
              {character.job}
            </Badge>
            <CardTitle className="font-[family-name:var(--font-display)] text-xl text-amber-50">
              {character.name}
            </CardTitle>
            <p className="text-xs text-amber-100/50">{character.reading}</p>
          </div>
        </div>
        {measurements ? (
          <p className="text-sm tabular-nums tracking-wide text-amber-50/75">{measurements}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="rounded-lg bg-black/25 px-3 py-2 text-sm leading-relaxed text-amber-50/80">
          <span className="mb-1 block text-[10px] tracking-wide text-amber-100/40">今夜</span>
          「{tonight ?? character.greeting}」
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {character.situations.map((scene) => {
            const Icon = situationIcon(scene.id, scene.season, scene.costume);
            return (
              <span
                key={scene.id}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-amber-100/60"
              >
                <Icon className="size-3" />
                {scene.title}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-xs tracking-wide text-amber-100/45">{character.tone}</p>
      </CardContent>
      <CardFooter className="border-white/10 bg-black/20">
        <Link
          href={`/c/${character.id}`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "w-full bg-rose-200 text-stone-900 hover:bg-rose-100"
          )}
        >
          話しかける
        </Link>
      </CardFooter>
    </Card>
  );
}
