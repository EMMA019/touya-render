"use client";

import { useChatMode } from "@/components/mode-provider";
import {
  REPLY_STYLES,
  REPLY_STYLE_LABELS,
  type ReplyStyle,
} from "@/lib/reply-style";
import { cn } from "@/lib/utils";

export function ReplyStylePicker({ className }: { className?: string }) {
  const { replyStyle, applyReplyStyle } = useChatMode();

  return (
    <div
      role="radiogroup"
      aria-label="返信スタイル"
      className={cn("flex gap-1.5 overflow-x-auto [scrollbar-width:none]", className)}
    >
      {REPLY_STYLES.map((style) => {
        const selected = replyStyle === style;
        return (
          <button
            key={style}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => void applyReplyStyle(style)}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] backdrop-blur-md",
              selected ? "bg-white/90 text-stone-900" : "bg-black/40 text-white/80"
            )}
          >
            {REPLY_STYLE_LABELS[style as ReplyStyle]}
          </button>
        );
      })}
    </div>
  );
}
