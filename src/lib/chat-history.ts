import { jstDayKey } from "./config";

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
};

export const CHAT_HISTORY_LIMIT = 20;
const PREFIX = "touya-chat-v1:";
const VISIT_PREFIX = "touya-visit-v1:";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function chatStorageKey(characterId: string): string {
  return `${PREFIX}${characterId}`;
}

export function loadChat(characterId: string): StoredChatMessage[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(chatStorageKey(characterId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && (row.role === "user" || row.role === "assistant") && typeof row.content === "string")
      .map((row) => ({ ...row, pending: false }))
      .slice(-CHAT_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function saveChat(characterId: string, messages: StoredChatMessage[]) {
  if (!isBrowser()) return;
  const compact = messages
    .filter((row) => row.content.trim().length > 0)
    .slice(-CHAT_HISTORY_LIMIT)
    .map(({ id, role, content }) => ({ id, role, content }));
  window.localStorage.setItem(chatStorageKey(characterId), JSON.stringify(compact));
}

export function loadLastVisitDay(characterId: string): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(`${VISIT_PREFIX}${characterId}`);
}

export function markVisit(characterId: string, now = new Date()): string {
  const day = jstDayKey(now);
  if (isBrowser()) {
    window.localStorage.setItem(`${VISIT_PREFIX}${characterId}`, day);
  }
  return day;
}

const HOOK_PREFIX = "touya-hook-v1:";

export function saveHook(characterId: string, text: string, now = new Date()) {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    `${HOOK_PREFIX}${characterId}`,
    JSON.stringify({ day: jstDayKey(now), text: text.slice(0, 160) })
  );
}

export function loadHook(characterId: string): string | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(`${HOOK_PREFIX}${characterId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { day?: string; text?: string };
    return parsed.text?.trim() || null;
  } catch {
    return null;
  }
}

export function clearHook(characterId: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(`${HOOK_PREFIX}${characterId}`);
}
