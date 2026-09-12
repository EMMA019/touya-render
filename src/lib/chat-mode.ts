export type ChatMode = "sfw" | "nsfw";

export const DEFAULT_CHAT_MODE: ChatMode = "sfw";
export const CHAT_MODES: readonly ChatMode[] = ["sfw", "nsfw"];

export const NSFW_AGE_REQUIRED = "nsfw_age_required";
export const NSFW_AGE_REQUIRED_JA = "18歳以上の確認が必要です。";
export const ADS_OFF_ERROR = "ads_off";
export const ADS_OFF_JA = "このモードでは広告は使えません。";

export type ModePublic = {
  chatMode: ChatMode;
  ageConfirmed: boolean;
  ageConfirmedAt: string | null;
  adsEnabled: boolean;
};

export type ModeResolve =
  | { ok: true; mode: ChatMode }
  | { ok: false; error: typeof NSFW_AGE_REQUIRED; mode: ChatMode };

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
 */
export function resolveChatMode(input: {
  requested?: unknown;
  storedMode?: unknown;
  ageConfirmed: boolean;
}): ModeResolve {
  const stored = coerceChatMode(input.storedMode);
  const requested = input.requested === undefined ? null : parseChatMode(input.requested);

  if (requested === null && input.requested !== undefined && input.requested !== null) {
    return { ok: true, mode: effectiveStoredMode(stored, input.ageConfirmed) };
  }

  const next = requested ?? stored;
  if (next === "nsfw" && !input.ageConfirmed) {
    return { ok: false, error: NSFW_AGE_REQUIRED, mode: DEFAULT_CHAT_MODE };
  }
  return { ok: true, mode: next };
}

export function effectiveStoredMode(stored: ChatMode, ageConfirmed: boolean): ChatMode {
  if (stored === "nsfw" && !ageConfirmed) return DEFAULT_CHAT_MODE;
  return stored;
}

export function toModePublic(input: {
  chatMode: ChatMode;
  ageConfirmed: boolean;
  ageConfirmedAt: string | null;
  adsEnabled: boolean;
}): ModePublic {
  const chatMode = effectiveStoredMode(input.chatMode, input.ageConfirmed);
  return {
    chatMode,
    ageConfirmed: input.ageConfirmed,
    ageConfirmedAt: input.ageConfirmed ? input.ageConfirmedAt : null,
    adsEnabled: input.adsEnabled && chatMode !== "nsfw",
  };
}
