"use client";

import Link from "next/link";
import { dailyHref, untilNextLabel, type DailyPublic } from "@/lib/daily";
import { cn } from "@/lib/utils";

export function DailyBanner({
  daily,
  className,
}: {
  daily: DailyPublic | DailyPublicLike | null | undefined;
  className?: string;
}) {
  if (!daily?.characterId || !daily.situationId) return null;
  const progress = untilNextLabel(daily.untilNext, daily.untilNextName);

  return (
    <Link
      href={dailyHref(daily)}
      className={cn(
        "group block overflow-hidden rounded-2xl border border-amber-200/20 bg-[#161020] shadow-[0_12px_40px_rgba(0,0,0,0.28)]",
        "transition hover:-translate-y-0.5 hover:border-amber-200/45",
        className,
      )}
    >
      <article className="grid grid-cols-[7.5rem_1fr] sm:grid-cols-[9rem_1fr]">
        <div
          className="relative min-h-[7.5rem] overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #3a2030, #1a1020)",
          }}
        >
          {daily.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={daily.image} alt="" className="h-full w-full object-cover object-[center_18%]" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#161020]" />
        </div>
        <div className="flex flex-col justify-center gap-1.5 px-3 py-3 sm:px-4">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-amber-200/70">今日のカード</p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[11px] text-amber-100/55">今日の相手</span>
            <span className="text-sm font-semibold text-amber-50">{daily.givenName || daily.characterName}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[11px] text-amber-100/55">今日のシチュ</span>
            <span className="text-sm font-medium text-amber-100 group-hover:text-amber-50">{daily.title}</span>
          </div>
          <p className="line-clamp-2 text-[11px] leading-relaxed text-amber-100/55">{daily.blurb}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {progress ? (
              <span className="rounded-full bg-amber-200/10 px-2 py-0.5 text-[10px] text-amber-100/80">{progress}</span>
            ) : null}
            {daily.firstToday ? (
              <span className="rounded-full bg-rose-300/10 px-2 py-0.5 text-[10px] text-rose-100/80">今日も来た</span>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}

type DailyPublicLike = {
  characterId: string;
  situationId: string;
  title: string;
  blurb?: string;
  characterName?: string;
  givenName?: string;
  image?: string | null;
  untilNext?: number | null;
  untilNextName?: string | null;
  firstToday?: boolean;
};
