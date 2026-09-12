import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS } from "./config";

export type ChatRole = "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

export function trimHistory(messages: ChatTurn[]): ChatTurn[] {
  const cleaned: ChatTurn[] = [];
  for (const raw of messages) {
    if (raw.role !== "user" && raw.role !== "assistant") continue;
    const content = String(raw.content ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;
    cleaned.push({ role: raw.role, content });
  }
  return cleaned.slice(-MAX_HISTORY_MESSAGES);
}

export function lastUserText(messages: ChatTurn[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}
