import type { ChatMode } from "./chat-mode";

export type ChatBackend = "deepseek" | "openrouter" | "demo";

export type ChatBackendResolve =
  | { ok: true; backend: ChatBackend }
  | { ok: false; error: "no_backend" | "openrouter_missing" };

/**
 * SFW → DeepSeek (or canned demo if the DeepSeek key is missing).
 * NSFW → OpenRouter only. Never fall back to DeepSeek.
 */
export function resolveChatBackend(input: {
  mode: ChatMode;
  hasDeepseekKey: boolean;
  hasOpenRouterKey: boolean;
  demoEnabled: boolean;
}): ChatBackendResolve {
  if (input.mode === "nsfw") {
    if (input.hasOpenRouterKey) return { ok: true, backend: "openrouter" };
    return { ok: false, error: "openrouter_missing" };
  }
  if (input.hasDeepseekKey) return { ok: true, backend: "deepseek" };
  if (input.demoEnabled) return { ok: true, backend: "demo" };
  return { ok: false, error: "no_backend" };
}
