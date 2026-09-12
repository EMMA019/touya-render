import {
  DEEPSEEK_TIMEOUT_MS,
  MAX_COMPLETION_TOKENS,
  openRouterBaseUrl,
  openRouterNsfwModel,
} from "./config";
import type { ChatTurn } from "./messages";

export async function streamOpenRouter(args: {
  systemPrompt: string;
  messages: ChatTurn[];
}): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const response = await fetch(`${openRouterBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://touya.onrender.com",
      "X-Title": "Touya",
    },
    signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
    body: JSON.stringify({
      model: openRouterNsfwModel(),
      stream: true,
      temperature: 0.7,
      max_tokens: MAX_COMPLETION_TOKENS,
      messages: [
        { role: "system", content: args.systemPrompt },
        ...args.messages,
      ],
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenRouter ${response.status} ${detail.slice(0, 180)}`);
  }

  return response.body;
}
