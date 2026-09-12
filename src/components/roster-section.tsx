"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CharacterCard } from "@/components/character-card";
import { buttonVariants } from "@/components/ui/button";
import {
  ART_STYLE_LABEL,
  ART_STYLES,
  resolveArtStyle,
  type ArtStyle,
  type CharacterPublic,
} from "@/lib/character-types";
import { cn } from "@/lib/utils";

export function RosterSection({ characters }: { characters: CharacterPublic[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const style = resolveArtStyle(params.get("style"));
  const visible = characters.filter((character) => resolveArtStyle(character.artStyle) === style);

  function select(next: ArtStyle) {
    const qs = new URLSearchParams(params.toString());
    if (next === "anime") qs.delete("style");
    else qs.set("style", next);
    const suffix = qs.toString();
    router.replace(suffix ? `/?${suffix}` : "/", { scroll: false });
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm tracking-wide text-amber-100/60">今夜の相手を選ぶ</h2>
          <p className="mt-1 text-xs text-amber-100/45">見た目の系統。会話の約束は同じです。</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="見た目の系統">
          {ART_STYLES.map((option) => {
            const active = style === option;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => select(option)}
                className={cn(
                  buttonVariants({ size: "sm", variant: active ? "default" : "outline" }),
                  active
                    ? "bg-rose-200 text-stone-900 hover:bg-rose-100"
                    : "border-white/15 bg-white/5 text-amber-50 hover:bg-white/10"
                )}
              >
                {ART_STYLE_LABEL[option]}
              </button>
            );
          })}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-8 text-sm text-amber-100/60">
          この系統の相手はまだいません。JSON を1枚足せば出ます。
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      )}
    </section>
  );
}
