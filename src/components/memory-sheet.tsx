"use client";

import { X } from "lucide-react";
import type { MemoryRow } from "@/lib/memory-types";

const KIND_LABEL: Record<string, string> = {
  profile: "呼び名",
  preference: "好み",
  relationship: "関係",
  agreement: "約束",
};

export function MemorySheet({
  open,
  facts,
  onClose,
  onForget,
}: {
  open: boolean;
  facts: MemoryRow[];
  onClose: () => void;
  onForget: (text: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/50 p-3 backdrop-blur-sm">
      <div className="w-full rounded-2xl bg-stone-950/95 p-4 text-amber-50 ring-1 ring-white/10">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">覚えていること</p>
          <button type="button" aria-label="閉じる" onClick={onClose} className="grid size-8 place-items-center">
            <X className="size-4" />
          </button>
        </div>
        {facts.length === 0 ? (
          <p className="text-xs leading-relaxed text-amber-100/60">
            まだ記憶している内容はありません。「覚えておいて」と頼まれたことや、お名前、好みの話題など、ずっと続く事柄だけを大切に留めていきます。
          </p>
        ) : (
          <ul className="space-y-2">
            {facts.map((fact) => (
              <li
                key={`${fact.kind}-${fact.text}`}
                className="flex items-start justify-between gap-3 rounded-xl bg-white/5 px-3 py-2"
              >
                <div>
                  <p className="text-[10px] tracking-wide text-amber-100/45">
                    {KIND_LABEL[fact.kind] ?? fact.kind}
                  </p>
                  <p className="text-sm text-amber-50">{fact.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onForget(fact.text)}
                  className="shrink-0 text-[11px] text-amber-100/55 underline-offset-2 hover:underline"
                >
                  忘れさせる
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
