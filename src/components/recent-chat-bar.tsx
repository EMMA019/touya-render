"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, ChevronRight, X } from "lucide-react";
import type { CharacterPublic } from "@/lib/character-types";
import { loadChat } from "@/lib/chat-history";
import { CharacterAvatar } from "@/components/character-avatar";

export function RecentChatBar({ roster }: { roster: CharacterPublic[] }) {
  const [recentCharacter, setRecentCharacter] = useState<CharacterPublic | null>(null);
  const [lastSnippet, setLastSnippet] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Find character with most recent chat in localStorage
    for (const character of roster) {
      const messages = loadChat(character.id);
      if (messages.length > 0) {
        const lastMsg = [...messages].reverse().find((m) => m.content.trim().length > 0);
        if (lastMsg) {
          setRecentCharacter(character);
          setLastSnippet(lastMsg.content.slice(0, 32));
          break;
        }
      }
    }
  }, [roster]);

  if (!recentCharacter || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200/25 bg-[#140e1c]/95 p-2.5 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <Link
          href={`/c/${recentCharacter.id}`}
          className="flex flex-1 items-center gap-3 overflow-hidden text-left"
        >
          <CharacterAvatar character={recentCharacter} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="flex size-1.5 rounded-full bg-emerald-400" />
              <p className="text-[11px] font-medium text-amber-200/90">
                続きから会話する ・ {recentCharacter.name}
              </p>
            </div>
            <p className="truncate text-xs text-amber-50/75">
              {lastSnippet || `「${recentCharacter.greeting}」`}
            </p>
          </div>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
            <ChevronRight className="size-4" />
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="閉じる"
          className="p-1 text-white/40 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
