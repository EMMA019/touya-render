"use client";

import { cn } from "@/lib/utils";

export function AffinityLevelBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="mx-3 mt-2 rounded-2xl bg-rose-400/20 px-3 py-2 text-center text-[12px] leading-relaxed text-rose-50 backdrop-blur-md"
      role="status"
    >
      {message}
      <button
        type="button"
        className="ml-2 text-[10px] text-rose-100/70 underline-offset-2 hover:underline"
        onClick={onDismiss}
      >
        閉じる
      </button>
    </div>
  );
}

export function AffinityToast({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "pointer-events-none mx-auto mt-2 w-fit rounded-full bg-black/55 px-3 py-1 text-[11px] text-rose-100/90 backdrop-blur-md",
        className,
      )}
      role="status"
    >
      {message}
    </p>
  );
}
