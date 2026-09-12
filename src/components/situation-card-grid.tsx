import Link from "next/link";
import { situationIcon } from "@/lib/situation-icons";
import type { CharacterPublic, SituationPublic } from "@/lib/character-types";

export function SituationCardGrid({ roster }: { roster: CharacterPublic[] }) {
  // Collect special and daily scenes across all characters
  const scenesWithChar: { scene: SituationPublic; character: CharacterPublic }[] = [];
  for (const c of roster) {
    for (const s of c.situations) {
      scenesWithChar.push({ scene: s, character: c });
    }
  }

  // Highlight a curated selection of 6 varied scenes
  const featured = scenesWithChar.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-amber-100/80">
          人気のシチュエーション・衣装カード
        </h3>
        <span className="text-xs text-amber-200/50">全{scenesWithChar.length}種</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {featured.map(({ scene, character }) => {
          const Icon = situationIcon(scene.id, scene.season, scene.costume);
          const img = scene.image || character.portraitImage;
          const isHalloween = scene.season === "halloween" || scene.costume === "halloween";

          return (
            <Link
              key={`${character.id}-${scene.id}`}
              href={`/c/${character.id}`}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#161020] transition hover:-translate-y-0.5 hover:border-amber-200/40 hover:shadow-lg"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-black/40">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={scene.title}
                    className="h-full w-full object-contain object-center transition duration-300"
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{
                      background: `linear-gradient(145deg, ${character.palette.from}, ${character.palette.to})`,
                    }}
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#120a16] via-transparent to-transparent opacity-90" />

                <div className="absolute top-2 left-2">
                  <span className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-amber-200 backdrop-blur-md">
                    <Icon className="size-2.5 text-amber-300" />
                    <span>{character.name.split(" ")[1] || character.name}</span>
                  </span>
                </div>

                <div className="absolute bottom-2 inset-x-2">
                  <p className="truncate text-xs font-medium text-amber-50 group-hover:text-amber-200">
                    {scene.title}
                  </p>
                  <p className="text-[10px] text-amber-200/60 truncate">
                    {isHalloween ? "ハロウィン衣装" : scene.costume ? "特別衣装" : "日常の場所"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
