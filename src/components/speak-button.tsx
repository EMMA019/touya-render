"use client";

import { Loader2, Volume2 } from "lucide-react";
import { useState } from "react";
import { playTtsAudio } from "@/lib/tts-client";
import { cn } from "@/lib/utils";

export function SpeakButton({
  characterId,
  text,
  onUnavailable,
}: {
  characterId: string;
  text: string;
  onUnavailable: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function play() {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      const result = await playTtsAudio(characterId, text);
      if (result === "unavailable") onUnavailable();
    } catch {
      onUnavailable();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      aria-label="音声で聞く"
      disabled={busy}
      onClick={() => void play()}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur-md",
        "hover:bg-black/55 hover:text-white disabled:opacity-60",
      )}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Volume2 className="size-3.5" />}
    </button>
  );
}
