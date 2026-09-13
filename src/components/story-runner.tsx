"use client";

import { useState } from "react";
import type { UiMessage } from "@/components/message-bubble";
import { apiUrl } from "@/lib/api-base";
import { anonymousHeaders } from "@/lib/anonymous-client";
import type { MemoryRow } from "@/lib/memory-types";
import { choiceBubble, storyBeatBubbles } from "@/lib/story-runner";
import type { StoryBeatPublic, StoryChoice, StoryPublic, StoryScriptPublic } from "@/lib/story-types";
import type { UnlockReason } from "@/lib/situation-unlock";
import { cn } from "@/lib/utils";

export type StoryStepResponse = {
  story: StoryPublic;
  beat: StoryBeatPublic | null;
  script?: StoryScriptPublic | null;
  unlocked?: string[];
  locks?: Record<string, Exclude<UnlockReason, "open">>;
  memory?: MemoryRow[];
  error?: string;
  message?: string;
};

/**
 * Choice buttons / 「つづける」 for the current story beat. Sits where the composer
 * normally is. Every tap is one small POST; the LLM is never called from here.
 * `free` beats render nothing — ChatView shows the composer and tags the send.
 */
export function StoryRunner({
  characterId,
  chapterId,
  beat,
  onStep,
  onBubbles,
  onOutOfStep,
  className,
}: {
  characterId: string;
  chapterId: string;
  beat: StoryBeatPublic;
  onStep: (response: StoryStepResponse) => void;
  onBubbles: (bubbles: UiMessage[]) => void;
  onOutOfStep: () => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `free` hands over to the composer; `end` / `defer` never wait (server already closed the chapter).
  if (beat.kind === "free" || beat.kind === "end" || beat.kind === "defer") return null;

  async function post(path: "choice" | "advance", extra: Record<string, string>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/story/${path}`), {
        method: "POST",
        headers: anonymousHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ characterId, chapterId, beatId: beat.id, ...extra }),
      });
      const body = (await response.json().catch(() => ({}))) as StoryStepResponse;
      if (response.status === 400 && body.error === "story_out_of_step") {
        onOutOfStep();
        return;
      }
      if (!response.ok) {
        setError(body.message ?? "少し待ってから、もう一度。");
        return;
      }
      if (body.beat) onBubbles(storyBeatBubbles(chapterId, body.beat));
      onStep(body);
    } catch {
      setError("つながらなかった。もう一度。");
    } finally {
      setBusy(false);
    }
  }

  function choose(choice: StoryChoice) {
    onBubbles([choiceBubble(chapterId, beat.id, choice)]);
    void post("choice", { choiceId: choice.id });
  }

  return (
    <div className={cn("space-y-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2", className)}>
      {error ? (
        <p className="text-center text-[11px] text-rose-200" role="alert">
          {error}
        </p>
      ) : null}
      {beat.kind === "choice" ? (
        <div className="flex flex-col gap-1.5">
          {(beat.choices ?? []).map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={busy}
              onClick={() => choose(choice)}
              className="w-full rounded-2xl bg-white/90 px-4 py-2.5 text-left text-sm leading-relaxed text-stone-900 backdrop-blur-md transition disabled:opacity-50"
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void post("advance", {})}
          className="w-full rounded-full bg-black/55 px-4 py-2.5 text-sm text-white backdrop-blur-md disabled:opacity-50"
        >
          つづける ▸
        </button>
      )}
    </div>
  );
}
