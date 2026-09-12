import {
  DEEPSEEK_BASE_URL,
  DEEPSEEK_TIMEOUT_MS,
  MAX_COMPLETION_TOKENS,
  deepseekModel,
} from "./config";
import type { ChatTurn } from "./messages";

export async function streamDeepseek(args: {
  systemPrompt: string;
  messages: ChatTurn[];
}): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY is missing");
  }

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
    body: JSON.stringify({
      model: deepseekModel(),
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
    throw new Error(`DeepSeek ${response.status} ${detail.slice(0, 180)}`);
  }

  return response.body;
}

export function extractDelta(payload: string): string {
  if (!payload || payload === "[DONE]") return "";
  try {
    const json = JSON.parse(payload) as {
      choices?: { delta?: { content?: string | null } }[];
    };
    return json.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}
