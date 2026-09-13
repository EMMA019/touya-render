"use client";

import { Gift, X } from "lucide-react";
import type { GiftPublic } from "@/lib/gift-types";
import { cn } from "@/lib/utils";

export function GiftSheet({
  open,
  gifts,
  giftedToday,
  sending,
  error,
  onClose,
  onGive,
}: {
  open: boolean;
  gifts: GiftPublic[];
  giftedToday: boolean;
  sending: boolean;
  error?: string | null;
  onClose: () => void;
  onGive: (giftId: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/50 p-3 backdrop-blur-sm">
      <div className="w-full rounded-2xl bg-stone-950/95 p-4 text-amber-50 ring-1 ring-white/10">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Gift className="size-3.5" />
            贈る
          </p>
          <button type="button" aria-label="閉じる" onClick={onClose} className="grid size-8 place-items-center">
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-amber-100/55">
          {giftedToday
            ? "今日はもう贈ったよ。また明日ね。"
            : "1日1つ。チャットの代わりにはならない。"}
        </p>
        <ul className="grid grid-cols-2 gap-2">
          {gifts.map((gift) => {
            const locked = giftedToday || sending || gift.premium;
            return (
              <li key={gift.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onGive(gift.id)}
                  className={cn(
                    "flex h-full w-full flex-col items-start gap-1 rounded-xl bg-white/5 px-3 py-2.5 text-left ring-1 ring-white/8 disabled:opacity-40",
                    !locked && "hover:bg-white/10",
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm">{gift.name}</span>
                    <span className="text-[10px] text-rose-200/80">+{gift.affinityDelta}</span>
                  </span>
                  <span className="text-[11px] leading-snug text-amber-100/55">{gift.hint}</span>
                  {gift.favorite ? (
                    <span className="text-[10px] text-amber-200/70">お好み</span>
                  ) : null}
                  {gift.premium ? (
                    <span className="text-[10px] text-amber-100/40">Booth で後から</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        {error ? (
          <p className="mt-3 text-center text-[11px] text-rose-200" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
