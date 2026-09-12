import type { SituationPublic } from "./character-types";
import { situationLineMinLevel, situationLineText } from "./character-types";

export { situationGreeting, toPublicSituation } from "./character-types";

export type SeedMessage = {
  id: string;
  role: string;
  content: string;
};

/** Client-seeded scene opening. Never calls the chat API or burns quota. */
export function seedSituationGreeting<T extends SeedMessage>(
  messages: T[],
  situationId: string,
  greeting: string,
): T[] {
  const text = greeting.trim();
  if (!text || !situationId) return messages;
  const bubble = { id: `situation-${situationId}`, role: "assistant", content: text } as T;
  const hasUser = messages.some((row) => row.role === "user");
  if (!hasUser) return [bubble];
  const last = messages.at(-1);
  if (last?.id === bubble.id) return messages;
  if (last?.role === "assistant" && last.id.startsWith("situation-")) {
    return [...messages.slice(0, -1), bubble];
  }
  return [...messages, bubble];
}

export function situationCardLines(
  situation?: Pick<SituationPublic, "lines"> | null,
  level = 0,
): string[] {
  return (situation?.lines ?? [])
    .filter((line) => situationLineMinLevel(line) <= level)
    .map((line) => situationLineText(line))
    .filter(Boolean)
    .slice(0, 3);
}
