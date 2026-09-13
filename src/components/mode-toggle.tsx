"use client";

import { Lock } from "lucide-react";
import { useChatMode } from "@/components/mode-provider";
import { cn } from "@/lib/utils";

export function ModeToggle({
  className,
  compact = false,
  locked = false,
  onLocked,
}: {
  className?: string;
  compact?: boolean;
  /** Relationship below 特別: show the lock, do not call /api/mode. */
  locked?: boolean;
  onLocked?: () => void;
}) {
  const { chatMode, applyMode, leaveNsfw, openAgeGate } = useChatMode();
  const nsfw = chatMode === "nsfw";

  function onClick() {
    if (nsfw) {
      void leaveNsfw();
      return;
    }
    if (locked) {
      onLocked?.();
      return;
    }
    void applyMode("nsfw").then((next) => {
      if (!next) openAgeGate();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={nsfw ? "SFWに戻す" : locked ? "NSFWはまだ開かない" : "NSFWに切り替える"}
      title={nsfw ? "NSFW（タップでSFW）" : locked ? "まだ、そこまでじゃない。" : "SFW（タップで切替）"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase backdrop-blur-md",
        nsfw
          ? "border-rose-300/35 bg-rose-400/15 text-rose-100"
          : "border-white/15 bg-black/35 text-amber-50/80",
        compact && "px-2 py-1",
        className
      )}
    >
      {!nsfw && locked ? <Lock className="size-2.5 opacity-70" aria-hidden /> : null}
      {nsfw ? "NSFW" : "SFW"}
    </button>
  );
}
