import {
  DEEPSEEK_TIMEOUT_MS,
  MAX_COMPLETION_TOKENS,
  openRouterBaseUrl,
  openRouterNsfwModel,
} from "./config";
import type { ChatTurn } from "./messages";

function openRouterHeaders(): HeadersInit {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://touya.onrender.com",
    "X-Title": "Touya",
  };
}

function openRouterMessages(args: { systemPrompt: string; messages: ChatTurn[] }) {
  return [{ role: "system", content: args.systemPrompt }, ...args.messages];
}

export async function streamOpenRouter(args: {
  systemPrompt: string;
  messages: ChatTurn[];
}): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${openRouterBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: openRouterHeaders(),
    signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
    body: JSON.stringify({
      model: openRouterNsfwModel(),
      stream: true,
      temperature: 0.7,
      max_tokens: MAX_COMPLETION_TOKENS,
      messages: openRouterMessages(args),
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenRouter ${response.status} ${detail.slice(0, 180)}`);
  }

  return response.body;
}

/** One-shot non-stream completion. Used only for Latin-token repair. */
export async function completeOpenRouter(args: {
  systemPrompt: string;
  messages: ChatTurn[];
}): Promise<string> {
  const response = await fetch(`${openRouterBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: openRouterHeaders(),
    signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
    body: JSON.stringify({
      model: openRouterNsfwModel(),
      stream: false,
      temperature: 0.5,
      max_tokens: MAX_COMPLETION_TOKENS,
      messages: openRouterMessages(args),
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenRouter ${response.status} ${detail.slice(0, 180)}`);
  }
  const json = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}
