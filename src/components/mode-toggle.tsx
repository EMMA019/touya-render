"use client";

import { Lock } from "lucide-react";
import { useChatMode } from "@/components/mode-provider";
import { NSFW_LOCK_HINT, canAccessNsfw } from "@/lib/chat-mode";
import { cn } from "@/lib/utils";

export function ModeToggle({
  className,
  compact = false,
  characterId,
  affinityLevel = 0,
}: {
  className?: string;
  compact?: boolean;
  characterId?: string;
  affinityLevel?: number;
}) {
  const { chatMode, ageConfirmed, applyMode, leaveNsfw, openAgeGate } = useChatMode();
  const nsfw = chatMode === "nsfw";
  const unlocked = canAccessNsfw({ affinityLevel, ageConfirmed: true }) && Boolean(characterId);
  const locked = !nsfw && !unlocked;

  function onClick() {
    if (nsfw) {
      void leaveNsfw();
      return;
    }
    if (!characterId || !canAccessNsfw({ affinityLevel, ageConfirmed: true })) {
      return;
    }
    if (!ageConfirmed) {
      openAgeGate({ characterId, affinityLevel });
      return;
    }
    void applyMode("nsfw", { characterId, affinityLevel });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      aria-label={
        nsfw ? "SFWに戻す" : locked ? NSFW_LOCK_HINT : "NSFWに切り替える"
      }
      title={
        nsfw
          ? "NSFW（タップでSFW）"
          : locked
            ? NSFW_LOCK_HINT
            : "SFW（タップで切替）"
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase backdrop-blur-md",
        nsfw
          ? "border-rose-300/35 bg-rose-400/15 text-rose-100"
          : locked
            ? "cursor-not-allowed border-white/10 bg-black/25 text-amber-50/45"
            : "border-white/15 bg-black/35 text-amber-50/80",
        compact && "px-2 py-1",
        className
      )}
    >
      {locked ? <Lock className="size-2.5" /> : null}
      {nsfw ? "NSFW" : "SFW"}
    </button>
  );
}
