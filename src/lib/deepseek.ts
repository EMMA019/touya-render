import {
  DEEPSEEK_BASE_URL,
  DEEPSEEK_TIMEOUT_MS,
  MAX_COMPLETION_TOKENS,
  deepseekModel,
} from "./config";
import type { ChatTurn } from "./messages";

function deepseekHeaders(): HeadersInit {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY is missing");
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function deepseekMessages(args: { systemPrompt: string; messages: ChatTurn[] }) {
  return [{ role: "system", content: args.systemPrompt }, ...args.messages];
}

export async function streamDeepseek(args: {
  systemPrompt: string;
  messages: ChatTurn[];
}): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: deepseekHeaders(),
    signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
    body: JSON.stringify({
      model: deepseekModel(),
      stream: true,
      temperature: 0.7,
      max_tokens: MAX_COMPLETION_TOKENS,
      messages: deepseekMessages(args),
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek ${response.status} ${detail.slice(0, 180)}`);
  }

  return response.body;
}

/** One-shot non-stream completion. Used only for Latin-token repair. */
export async function completeDeepseek(args: {
  systemPrompt: string;
  messages: ChatTurn[];
}): Promise<string> {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: deepseekHeaders(),
    signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
    body: JSON.stringify({
      model: deepseekModel(),
      stream: false,
      temperature: 0.5,
      max_tokens: MAX_COMPLETION_TOKENS,
      messages: deepseekMessages(args),
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek ${response.status} ${detail.slice(0, 180)}`);
  }
  const json = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
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
