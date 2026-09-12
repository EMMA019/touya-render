"use client";

import type { SituationPublic } from "@/lib/character-types";
import { situationCardLines } from "@/lib/situation-greeting";

export function SituationSceneCard({
  situation,
  level = 0,
  onDismiss,
}: {
  situation?: SituationPublic;
  level?: number;
  onDismiss: () => void;
}) {
  const lines = situationCardLines(situation, level);
  if (!situation) return null;

  return (
    <button
      type="button"
      onClick={onDismiss}
      className="mx-3 mt-3 w-[calc(100%-1.5rem)] rounded-2xl border border-white/15 bg-black/60 px-4 py-3 text-left text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md"
    >
      <p className="text-[10px] tracking-[0.18em] text-amber-100/55">SITUATION</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-amber-50">{situation.title}</p>
      {lines.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-amber-50/85">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2.5 text-[10px] text-white/70">タップして閉じる</p>
    </button>
  );
}
