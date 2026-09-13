import { FREE_DAILY_TURNS } from "@/lib/config";
import { cn } from "@/lib/utils";

export function DebugUnlimitedMark({
  on,
  className,
}: {
  on?: boolean;
  className?: string;
}) {
  if (!on) return null;
  return (
    <span
      className={cn(
        "rounded px-1 py-px text-[9px] font-bold tracking-wider text-lime-200 border border-lime-300/50 bg-lime-400/15",
        className,
      )}
      title="TOUYA_DEBUG_UNLIMITED — daily quota bypass. Not production."
    >
      DEBUG
    </span>
  );
}

export function QuotaPill({
  remaining,
  limit = FREE_DAILY_TURNS,
  debugUnlimited = false,
  className,
}: {
  remaining: number | null;
  limit?: number;
  debugUnlimited?: boolean;
  className?: string;
}) {
  if (debugUnlimited) return null;

  const label =
    remaining === null
      ? "読み込み中…"
      : `本日 残り ${remaining} / ${limit} 通`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-amber-50/85 backdrop-blur",
        remaining === 0 && !debugUnlimited && "border-rose-300/30 text-rose-100",
        debugUnlimited && "border-lime-300/35",
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          debugUnlimited ? "bg-lime-300" : remaining === 0 ? "bg-rose-300" : "bg-amber-300"
        )}
      />
      {label}
      <DebugUnlimitedMark on={debugUnlimited} />
    </div>
  );
}
