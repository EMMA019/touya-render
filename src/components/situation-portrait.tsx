import { PortraitStage } from "@/components/portrait-stage";
import type { CharacterPublic } from "@/lib/character-types";
import { cn } from "@/lib/utils";

export function SituationPortrait({
  character,
  situationId,
  className,
}: {
  character: CharacterPublic;
  situationId?: string;
  className?: string;
}) {
  const scene =
    character.situations.find((row) => row.id === situationId) ?? character.situations[0];

  return (
    <div className={cn("relative min-h-[280px] overflow-hidden", className)}>
      <PortraitStage character={character} situation={scene} motion={false} className="absolute inset-0" />
    </div>
  );
}
