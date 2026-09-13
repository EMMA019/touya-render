import type { UiMessage } from "@/components/message-bubble";
import type { StoryBeatPublic, StoryChapterPublic, StoryChoice, StoryScriptPublic } from "./story-types";

/**
 * Client-side pure helpers for the story runner (Web and, by mirror, Android).
 * Bubble ids are deterministic so re-renders and resumes never double-post.
 */

export const OPENING_IDS = /^(greeting|welcome-)/;

export function findChapterPublic(script: StoryScriptPublic | null | undefined, chapterId: string | null | undefined): StoryChapterPublic | null {
  if (!script || !chapterId) return null;
  return script.chapters.find((chapter) => chapter.id === chapterId) ?? null;
}

export function findBeatPublic(
  script: StoryScriptPublic | null | undefined,
  chapterId: string | null | undefined,
  beatId: string | null | undefined,
): StoryBeatPublic | null {
  const chapter = findChapterPublic(script, chapterId);
  if (!chapter || !beatId) return null;
  return chapter.beats.find((beat) => beat.id === beatId) ?? null;
}

export function storyBubbleId(chapterId: string, beatId: string, index: number | "n"): string {
  return `story-${chapterId}-${beatId}-${index}`;
}

/** Narration caption (if any) followed by one assistant bubble per `text` element. */
export function storyBeatBubbles(chapterId: string, beat: StoryBeatPublic): UiMessage[] {
  const out: UiMessage[] = [];
  if (beat.narration?.trim()) {
    out.push({ id: storyBubbleId(chapterId, beat.id, "n"), role: "assistant", content: beat.narration.trim(), narration: true });
  }
  beat.text.forEach((text, index) => {
    const content = text.trim();
    if (content) out.push({ id: storyBubbleId(chapterId, beat.id, index), role: "assistant", content });
  });
  return out;
}

export function choiceBubble(chapterId: string, beatId: string, choice: Pick<StoryChoice, "label" | "userText">): UiMessage {
  return {
    id: `choice-${chapterId}-${beatId}`,
    role: "user",
    content: (choice.userText ?? choice.label).trim(),
  };
}

/** Append only bubbles whose id is not already present. */
export function appendUnique(messages: UiMessage[], bubbles: UiMessage[]): UiMessage[] {
  const seen = new Set(messages.map((message) => message.id));
  const fresh = bubbles.filter((bubble) => !seen.has(bubble.id));
  return fresh.length === 0 ? messages : [...messages, ...fresh];
}

/** Drop the SSR greeting / welcome-back bubbles: the chapter speaks instead. Saved chat stays. */
export function stripOpening(messages: UiMessage[]): UiMessage[] {
  const next = messages.filter((message) => !OPENING_IDS.test(message.id));
  return next.length === messages.length ? messages : next;
}

/** Composer is hidden while a non-free beat waits for a tap. */
export function composerHidden(beat: StoryBeatPublic | null): boolean {
  return beat !== null && beat.kind !== "free";
}
