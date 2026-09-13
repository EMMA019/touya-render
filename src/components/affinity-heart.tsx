import { Heart } from "lucide-react";
import type { AffinityPublic } from "@/lib/affinity-types";
import { EMPTY_AFFINITY } from "@/lib/affinity-types";
import { cn } from "@/lib/utils";

export function AffinityHeart({
  affinity = EMPTY_AFFINITY,
  pending = false,
  className,
}: {
  affinity?: AffinityPublic;
  /** A chapter is waiting (count reached the next band, story has not caught up). */
  pending?: boolean;
  className?: string;
}) {
  const label = pending ? `${affinity.name}（続きがある）` : affinity.name;
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1.5 text-[11px] text-rose-100/90 backdrop-blur-md",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <Heart className="size-3 fill-rose-300/85 text-rose-300" />
      <span>{affinity.name}</span>
      {pending ? <span aria-hidden className="ml-0.5 size-1.5 rounded-full bg-amber-200" /> : null}
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
      <div className="flex items-center gap-1 text-[10px] text-rose-200/80">
        <Heart className="size-2.5 fill-rose-300/80 text-rose-300" />
        <span>{affinity.name}</span>
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="h-full rounded-full bg-rose-300/80" style={{ width }} />
      </div>
    </div>
  );
}
