"use client";

import { useChatMode } from "@/components/mode-provider";
import { AD_COPY, ADS_ENABLED, type AdPlacement } from "@/lib/ads";
import { cn } from "@/lib/utils";

type AdSlotProps = {
  placement: AdPlacement;
  className?: string;
};

export function AdSlot({ placement, className }: AdSlotProps) {
  const { adsEnabled } = useChatMode();
  if (!ADS_ENABLED || !adsEnabled) return null;
  const copy = AD_COPY[placement];

  return (
    <aside
      data-ad-placement={placement}
      data-ad-provider="admob"
      aria-label="AdMob 広告枠"
      className={cn(
        "relative overflow-hidden rounded-xl border border-dashed border-amber-200/25 bg-amber-100/5",
        placement === "banner" && "min-h-[72px] w-full",
        placement === "sidebar" && "min-h-[200px] w-full",
        placement === "infeed" && "min-h-[64px] w-full",
        placement === "rewarded" && "min-h-[88px] w-full",
        className
      )}
    >
      {/*
        TODO(policy): replace with official AdMob web / GPT snippet after
        a non-NSFW inventory review. Do not invent ad unit IDs.
        Env: NEXT_PUBLIC_ADMOB_APP_ID / *_BANNER_UNIT / *_REWARDED_UNIT
      */}
      <div className="flex h-full min-h-[inherit] flex-col items-center justify-center gap-1 px-3 py-3 text-center">
        <p className="text-[10px] font-medium tracking-[0.2em] text-amber-100/55 uppercase">
          {copy.label}
        </p>
        <p className="text-xs text-amber-50/70">{copy.hint}</p>
        <p className="font-mono text-[10px] text-amber-100/40">{copy.size}</p>
      </div>
    </aside>
  );
}
