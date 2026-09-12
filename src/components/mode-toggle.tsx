"use client";

import { useChatMode } from "@/components/mode-provider";
import { cn } from "@/lib/utils";

export function ModeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { chatMode, applyMode, leaveNsfw, openAgeGate } = useChatMode();
  const nsfw = chatMode === "nsfw";

  function onClick() {
    if (nsfw) {
      void leaveNsfw();
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
      aria-label={nsfw ? "SFWに戻す" : "NSFWに切り替える"}
      title={nsfw ? "NSFW（タップでSFW）" : "SFW（タップで切替）"}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase backdrop-blur-md",
        nsfw
          ? "border-rose-300/35 bg-rose-400/15 text-rose-100"
          : "border-white/15 bg-black/35 text-amber-50/80",
        compact && "px-2 py-1",
        className
      )}
    >
      {nsfw ? "NSFW" : "SFW"}
    </button>
  );
}
