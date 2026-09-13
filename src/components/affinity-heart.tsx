import { Heart } from "lucide-react";
import type { AffinityPublic } from "@/lib/affinity-types";
import { EMPTY_AFFINITY } from "@/lib/affinity-types";
import { cn } from "@/lib/utils";

function progressLabel(affinity: AffinityPublic): string {
  if (affinity.nextAt == null || affinity.remainingToNext == null) return affinity.name;
  return `${affinity.name} ${affinity.count}/${affinity.nextAt}`;
}

export function AffinityHeart({
  affinity = EMPTY_AFFINITY,
  className,
}: {
  affinity?: AffinityPublic;
  className?: string;
}) {
  const label = progressLabel(affinity);
  const width = `${Math.round(Math.min(1, Math.max(0, affinity.progress)) * 100)}%`;
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-rose-100/90 backdrop-blur-md",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <div className="flex items-center gap-1">
        <Heart className="size-3 fill-rose-300/85 text-rose-300" />
        <span>{affinity.name}</span>
        {affinity.nextAt != null ? (
          <span className="font-mono text-[10px] tabular-nums text-rose-100/65">
            {affinity.count}/{affinity.nextAt}
          </span>
        ) : null}
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/15" aria-hidden>
        <div className="h-full rounded-full bg-rose-300/80" style={{ width }} />
      </div>
    </div>
  );
}

export function AffinityGauge({
  affinity = EMPTY_AFFINITY,
  className,
}: {
  affinity?: AffinityPublic;
  className?: string;
}) {
  const width = `${Math.round(Math.min(1, Math.max(0, affinity.progress)) * 100)}%`;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-1 text-[10px] text-rose-200/80">
        <span className="inline-flex items-center gap-1">
          <Heart className="size-2.5 fill-rose-300/80 text-rose-300" />
          <span>{affinity.name}</span>
        </span>
        {affinity.nextAt != null ? (
          <span className="font-mono tabular-nums text-rose-100/55">
            {affinity.count}/{affinity.nextAt}
          </span>
        ) : (
          <span className="text-rose-100/55">MAX</span>
        )}
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="h-full rounded-full bg-rose-300/80" style={{ width }} />
      </div>
    </div>
  );
}
