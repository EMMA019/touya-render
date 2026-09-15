import type { StoredChatMessage } from "./chat-history";

/**
 * First paint (SSR and client) must agree. Greeting text depends on
 * localStorage + JST clock, so start empty and fill after hydrate.
 */
export const EMPTY_CHAT_MESSAGES: StoredChatMessage[] = [];

export function hydrateChatMessages(args: {
  saved: StoredChatMessage[];
  lastDay: string | null;
  today: string;
  openingText: string;
}): { messages: StoredChatMessage[]; shouldClearHook: boolean } {
  if (args.saved.length > 0) {
    if (args.lastDay && args.lastDay !== args.today) {
      return {
        messages: [
          ...args.saved,
          {
            id: `welcome-${args.today}`,
            role: "assistant",
            content: args.openingText,
          },
        ],
        shouldClearHook: true,
      };
    }
    return { messages: args.saved, shouldClearHook: false };
  }
  return {
    messages: [{ id: "greeting", role: "assistant", content: args.openingText }],
    shouldClearHook: false,
  };
}
