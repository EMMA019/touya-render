"use client";

import { useChatMode } from "@/components/mode-provider";

export function AgeGateModal() {
  const { ageGateOpen, closeAgeGate, confirmAgeAndEnableNsfw } = useChatMode();
  if (!ageGateOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-[#1a1218] p-6 text-amber-50 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <p id="age-gate-title" className="text-lg font-medium tracking-wide">
          18歳以上です
        </p>
        <p className="mt-2 text-sm leading-relaxed text-amber-100/60">
          確認は端末にだけ残します。
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => void confirmAgeAndEnableNsfw()}
            className="flex-1 rounded-full bg-white px-3 py-2.5 text-sm font-medium text-stone-900"
          >
            続ける
          </button>
          <button
            type="button"
            onClick={closeAgeGate}
            className="flex-1 rounded-full border border-white/20 px-3 py-2.5 text-sm text-amber-50/85"
          >
            やめる
          </button>
        </div>
      </div>
    </div>
  );
}
