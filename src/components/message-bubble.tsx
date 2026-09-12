import { CharacterAvatar } from "@/components/character-avatar";
import type { CharacterPublic } from "@/lib/character-types";
import { cn } from "@/lib/utils";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
};

export function MessageBubble({
  message,
  character,
}: {
  message: UiMessage;
  character: CharacterPublic;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && <CharacterAvatar character={character} size="sm" className="mt-1" />}
      <div
        className={cn(
          "max-w-[min(78%,32rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "rounded-tr-md bg-amber-200 text-stone-900"
            : "rounded-tl-md bg-white/10 text-amber-50 ring-1 ring-white/10"
        )}
      >
        {message.content}
        {message.pending && (
          <span className="ml-1 inline-block animate-pulse text-amber-100/70">▍</span>
        )}
      </div>
    </div>
  );
}
