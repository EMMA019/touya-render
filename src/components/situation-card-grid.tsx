"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { SituationBackdrop } from "@/components/situation-backdrop";
import type { CharacterPublic } from "@/lib/character-types";
import {
  collectShelfCards,
  visibleShelfTabs,
  type ShelfCard,
  type ShelfTab,
} from "@/lib/situation-shelf";
import { cn } from "@/lib/utils";

function useLoadedArt(src: string | null | undefined) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(false);
  }, [src]);
  return {
    ok,
    src: src || null,
    markOk: () => setOk(true),
    markBad: () => setOk(false),
  };
}

export function SituationCardGrid({ roster }: { roster: CharacterPublic[] }) {
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [tab, setTab] = useState<ShelfTab>("all");
  const tabs = useMemo(() => visibleShelfTabs(roster), [roster]);
  const cards = useMemo(
    () => collectShelfCards(roster, { characterId, tab }),
    [roster, characterId, tab],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-bold tracking-tight text-amber-50">カード一覧</h3>
          <p className="text-xs text-amber-100/50">場面を選ぶと、その相手とその場所で話せます。</p>
        </div>
        <span className="text-xs text-amber-200/50">全{cards.length}枚</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <FilterAvatar
          selected={characterId == null}
          label="全員"
          onClick={() => setCharacterId(null)}
        />
        {roster.map((character) => (
          <FilterAvatar
            key={character.id}
            selected={characterId === character.id}
            label={character.name.split(/\s+/).at(-1) ?? character.name}
            image={character.portraitImage}
            from={character.palette.from}
            to={character.palette.to}
            onClick={() => setCharacterId(character.id === characterId ? null : character.id)}
          />
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] transition",
                selected
                  ? "bg-white text-stone-900"
                  : "bg-white/8 text-amber-50/80 ring-1 ring-white/10 hover:bg-white/12",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {cards.map((card) => (
          <ShelfCardLink key={card.key} card={card} />
        ))}
      </div>
    </section>
  );
}

function ShelfCardLink({ card }: { card: ShelfCard }) {
  const art = useLoadedArt(card.image);
  const showArt = Boolean(art.src && (art.ok || card.video));
  const inner = (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#161020]",
        !card.locked && "transition hover:-translate-y-0.5 hover:border-amber-200/40 hover:shadow-lg",
      )}
    >
      {art.src ? (
        // Hidden probe: keep real rasters, drop 404 / stub gray boxes.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.src} alt="" className="hidden" onLoad={art.markOk} onError={art.markBad} />
      ) : null}
      {showArt ? (
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/40">
          <SituationBackdrop
            image={art.ok ? card.image : null}
            video={card.locked ? null : card.video}
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120a16] via-transparent to-transparent opacity-90" />
          <ShelfCardCaption card={card} />
        </div>
      ) : (
        <div className="flex min-h-[4.5rem] flex-col justify-end gap-1 px-2 py-2">
          <ShelfCardCaption card={card} stacked />
        </div>
      )}
    </article>
  );

  if (card.locked) {
    return <div aria-disabled>{inner}</div>;
  }

  return <Link href={`/c/${card.characterId}?s=${encodeURIComponent(card.situationId)}`}>{inner}</Link>;
}

function ShelfCardCaption({ card, stacked = false }: { card: ShelfCard; stacked?: boolean }) {
  return (
    <div className={cn(stacked ? "relative" : "absolute bottom-0 inset-x-0 p-1.5 sm:p-2")}>
      <p className="truncate text-[11px] font-medium text-amber-50 sm:text-xs">{card.title}</p>
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <p className="truncate text-[10px] text-amber-200/70">{card.givenName}</p>
        <AffinityStars level={card.affinityLevel} />
      </div>
      {card.locked ? (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-50/80">
          <Lock className="size-3" />
          {card.lockHint}
        </p>
      ) : null}
    </div>
  );
}

function FilterAvatar({
  selected,
  label,
  image,
  from,
  to,
  onClick,
}: {
  selected: boolean;
  label: string;
  image?: string | null;
  from?: string;
  to?: string;
  onClick: () => void;
}) {
  const art = useLoadedArt(image);
  return (
    <button type="button" onClick={onClick} className="flex shrink-0 flex-col items-center gap-1">
      <span
        className={cn(
          "size-11 overflow-hidden rounded-full ring-2",
          selected ? "ring-amber-200" : "ring-white/15",
        )}
        style={{ background: `linear-gradient(160deg, ${from ?? "#2a2030"}, ${to ?? "#4a3040"})` }}
      >
        {art.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art.src}
            alt=""
            className={cn("h-full w-full object-cover object-[center_20%]", !art.ok && "hidden")}
            onLoad={art.markOk}
            onError={art.markBad}
          />
        ) : null}
        {!art.ok ? (
          <span className="grid h-full w-full place-items-center text-[10px] text-amber-50/80">
            {label === "全員" ? "全" : label.slice(0, 1)}
          </span>
        ) : null}
      </span>
      <span className="max-w-14 truncate text-[10px] text-amber-100/70">{label}</span>
    </button>
  );
}

function AffinityStars({ level }: { level: number }) {
  const filled = Math.min(3, Math.max(0, level));
  return (
    <span className="text-[9px] tracking-tight text-amber-200/80" aria-label={`親密度 ${level}`}>
      {"★".repeat(filled)}
      {"☆".repeat(3 - filled)}
    </span>
  );
}
