import { NSFW_MIN_AFFINITY_LEVEL } from "./affinity-types";

export type ChatMode = "sfw" | "nsfw";

export const DEFAULT_CHAT_MODE: ChatMode = "sfw";
export const CHAT_MODES: readonly ChatMode[] = ["sfw", "nsfw"];

export const NSFW_AGE_REQUIRED = "nsfw_age_required";
export const NSFW_AGE_REQUIRED_JA = "18歳以上の確認が必要です。";
export const NSFW_AFFINITY_REQUIRED = "nsfw_affinity_required";
export const NSFW_AFFINITY_REQUIRED_JA = "もっと仲良くなったら、特別な話ができるよ。";
export const NSFW_LOCK_HINT = "特別になってから";
export const ADS_OFF_ERROR = "ads_off";
export const ADS_OFF_JA = "このモードでは広告は使えません。";

export { NSFW_MIN_AFFINITY_LEVEL };

/**
 * Intimate / NSFW for this character. Age gate alone is not enough.
 * Debug unlimited never belongs here — quota only.
 */
export function canAccessNsfw(input: {
  affinityLevel?: number | null;
  ageConfirmed: boolean;
}): boolean {
  const level = Number.isFinite(input.affinityLevel) ? Number(input.affinityLevel) : 0;
  return input.ageConfirmed === true && level >= NSFW_MIN_AFFINITY_LEVEL;
}

export function nsfwDenial(input: {
  affinityLevel?: number | null;
  ageConfirmed: boolean;
}): typeof NSFW_AGE_REQUIRED | typeof NSFW_AFFINITY_REQUIRED | null {
  if (canAccessNsfw(input)) return null;
  if (!input.ageConfirmed) return NSFW_AGE_REQUIRED;
  return NSFW_AFFINITY_REQUIRED;
}

export function nsfwDenialMessage(
  error: typeof NSFW_AGE_REQUIRED | typeof NSFW_AFFINITY_REQUIRED,
): string {
  return error === NSFW_AGE_REQUIRED ? NSFW_AGE_REQUIRED_JA : NSFW_AFFINITY_REQUIRED_JA;
}

export type ModePublic = {
  chatMode: ChatMode;
  ageConfirmed: boolean;
  ageConfirmedAt: string | null;
  adsEnabled: boolean;
};

export type ModeResolve =
  | { ok: true; mode: ChatMode }
  | {
      ok: false;
      error: typeof NSFW_AGE_REQUIRED | typeof NSFW_AFFINITY_REQUIRED;
      mode: ChatMode;
    };

export function parseChatMode(value: unknown): ChatMode | null {
  if (value === "sfw" || value === "nsfw") return value;
  return null;
}

export function coerceChatMode(value: unknown): ChatMode {
  return parseChatMode(value) ?? DEFAULT_CHAT_MODE;
}

/**
 * Server-side mode decision. Stored profile is the source of truth;
 * a client `mode` flag is accepted only when it is allowed.
 * NSFW also needs this character at 特別 — age confirmation is not enough.
 * Debug unlimited is never consulted.
 */
export function resolveChatMode(input: {
  requested?: unknown;
  storedMode?: unknown;
  ageConfirmed: boolean;
  affinityLevel?: number | null;
}): ModeResolve {
  const stored = coerceChatMode(input.storedMode);
  const requested = input.requested === undefined ? null : parseChatMode(input.requested);
  const affinityLevel = input.affinityLevel ?? 0;
  const ageConfirmed = input.ageConfirmed;

  if (requested === null && input.requested !== undefined && input.requested !== null) {
    return { ok: true, mode: effectiveChatMode(stored, ageConfirmed, affinityLevel) };
  }

  const next = requested ?? stored;
  if (next === "nsfw") {
    const denied = nsfwDenial({ affinityLevel, ageConfirmed });
    if (denied) {
      if (requested === "nsfw") {
        return { ok: false, error: denied, mode: DEFAULT_CHAT_MODE };
      }
      return { ok: true, mode: DEFAULT_CHAT_MODE };
    }
  }
  return { ok: true, mode: next };
}

/** Age only. Used when persisting the visitor's mode preference. */
export function effectiveStoredMode(stored: ChatMode, ageConfirmed: boolean): ChatMode {
  if (stored === "nsfw" && !ageConfirmed) return DEFAULT_CHAT_MODE;
  return stored;
}

/** Age + this character's affinity. Used for chat / companion / ads-for-this-pair. */
export function effectiveChatMode(
  stored: ChatMode,
  ageConfirmed: boolean,
  affinityLevel = 0,
): ChatMode {
  if (stored !== "nsfw") return DEFAULT_CHAT_MODE;
  if (!canAccessNsfw({ affinityLevel, ageConfirmed })) return DEFAULT_CHAT_MODE;
  return "nsfw";
}

export function toModePublic(input: {
  chatMode: ChatMode;
  ageConfirmed: boolean;
  ageConfirmedAt: string | null;
  adsEnabled: boolean;
  affinityLevel?: number | null;
}): ModePublic {
  const chatMode =
    input.affinityLevel === undefined || input.affinityLevel === null
      ? effectiveStoredMode(input.chatMode, input.ageConfirmed)
      : effectiveChatMode(input.chatMode, input.ageConfirmed, input.affinityLevel);
  return {
    chatMode,
    ageConfirmed: input.ageConfirmed,
    ageConfirmedAt: input.ageConfirmed ? input.ageConfirmedAt : null,
    adsEnabled: input.adsEnabled && chatMode !== "nsfw",
  };
}
