export const APP_NAME = "燈夜";
export const APP_NAME_KANA = "とうや";

/** Free-tier rule: 1 user send = 1 turn. JST day. Shared across characters. */
export const FREE_DAILY_TURNS = 10;
/** Remaining shown when TOUYA_DEBUG_UNLIMITED=1. Never treat this as a real cap. */
export const DEBUG_UNLIMITED_REMAINING = 9999;
/** Stub rewarded-ad grant. Real AdMob rewarded comes later. */
export const REWARD_EXTRA_TURNS = 3;
export const REWARD_MAX_PER_DAY = 2;
/** Later Play Billing / anonymous unlock. App still collects no PII. */
export const PREMIUM_DAILY_TURNS = 40;

/** Keep prompts and history short to cut tokens. Completions need room for 3–6 JP sentences. */
export const MAX_HISTORY_MESSAGES = 8;
export const MAX_MESSAGE_CHARS = 400;
export const MAX_COMPLETION_TOKENS = 480;
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
/** Low-refusal / roleplay catalog id. Override with OPENROUTER_NSFW_MODEL. */
export const DEFAULT_OPENROUTER_NSFW_MODEL = "nousresearch/hermes-3-llama-3.1-70b";
export const OPENROUTER_MISSING_JA =
  "NSFW には OPENROUTER_API_KEY が必要です。DeepSeek には切り替えません。";

/** Legacy cookie name. New installs use ANON_COOKIE, set by the client. */
export const VISITOR_COOKIE = "touya_vid";
export const ANON_COOKIE = "touya_anon";
export const ANON_HEADER = "x-touya-vid";
export const USAGE_STORE_FILENAME = "usage.json";
export const ENTITLEMENTS_STORE_FILENAME = "entitlements.json";

export const MIN_REQUEST_GAP_MS = 1200;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 12;

/** Same visitor + same character: 3rd sexual ask blocks that pair for 30 minutes. */
export const SEXUAL_BLOCK_MS = 30 * 60 * 1000;
export const SEXUAL_STORE_FILENAME = "sexual-strikes.json";
export const MEMORY_STORE_FILENAME = "memory.json";
export const MEMORY_MAX_FACTS = 10;
export const MEMORY_SUMMARY_MAX_CHARS = 240;
export const BOND_STORE_FILENAME = "bonds.json";
export const AFFINITY_STORE_FILENAME = "affinity.json";
export const FEEDBACK_STORE_FILENAME = "feedback.json";
export const VISITOR_STORE_FILENAME = "visitors.json";

/** Daily quota and visit days follow Japan (JST), not UTC. */
export const QUOTA_TIMEZONE = "Asia/Tokyo";
export const DEEPSEEK_TIMEOUT_MS = 20_000;

export function jstDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: QUOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function jstMonth(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: QUOTA_TIMEZONE,
      month: "numeric",
    }).format(now)
  );
}

/** @deprecated Use jstDayKey. Kept so older imports keep compiling. */
export function utcDayKey(now = new Date()): string {
  return jstDayKey(now);
}

export function deepseekModel(): string {
  return process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL;
}

export function hasDeepseekKey(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export function hasOpenRouterKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function openRouterBaseUrl(): string {
  return (process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_BASE_URL).replace(/\/+$/, "");
}

export function openRouterNsfwModel(): string {
  return process.env.OPENROUTER_NSFW_MODEL?.trim() || DEFAULT_OPENROUTER_NSFW_MODEL;
}

/** Canned demo replies only when the API key is missing. TOUYA_DEMO=0 disables that fallback. */
export function demoFallbackEnabled(): boolean {
  if (hasDeepseekKey()) return false;
  return process.env.TOUYA_DEMO !== "0";
}

/** Local-only: ignore the daily free chat cap. Affinity and content gates stay on. */
export function debugUnlimitedEnabled(): boolean {
  return process.env.TOUYA_DEBUG_UNLIMITED?.trim() === "1";
}
