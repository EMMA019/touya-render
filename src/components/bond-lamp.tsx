import { BOND_LABEL, type BondStage } from "@/lib/bond-types";
import { cn } from "@/lib/utils";

const GLOW: Record<BondStage, string> = {
  first: "opacity-40",
  familiar: "opacity-75",
  regular: "opacity-100",
};

export function BondLamp({ stage, className }: { stage: BondStage; className?: string }) {
  const lit = stage === "first" ? 1 : stage === "familiar" ? 2 : 3;
  return (
    <div
      className={cn("flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur-md", className)}
      title={BOND_LABEL[stage]}
      aria-label={BOND_LABEL[stage]}
    >
      {[1, 2, 3].map((index) => (
        <span
          key={index}
          className={cn(
            "size-1.5 rounded-full",
            index <= lit ? `bg-amber-200 ${GLOW[stage]}` : "bg-white/20"
          )}
        />
      ))}
    </div>
  );
}
