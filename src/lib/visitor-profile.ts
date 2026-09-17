import { VISITOR_STORE_FILENAME } from "./config";
import {
  DEFAULT_CHAT_MODE,
  NSFW_AGE_REQUIRED,
  coerceChatMode,
  effectiveStoredMode,
  parseChatMode,
  type ChatMode,
} from "./chat-mode";
import { createJsonStore } from "./json-store";
import {
  DEFAULT_REPLY_STYLE,
  coerceReplyStyle,
  parseReplyStyle,
  type ReplyStyle,
} from "./reply-style";

export type VisitorProfile = {
  ageConfirmed: boolean;
  ageConfirmedAt: string | null;
  chatMode: ChatMode;
  replyStyle: ReplyStyle;
};

type StoreShape = { visitors: Record<string, VisitorProfile> };

const store = createJsonStore<StoreShape>({
  envKey: "VISITOR_STORE_PATH",
  filename: VISITOR_STORE_FILENAME,
  empty: () => ({ visitors: {} }),
});

export function emptyVisitorProfile(): VisitorProfile {
  return {
    ageConfirmed: false,
    ageConfirmedAt: null,
    chatMode: DEFAULT_CHAT_MODE,
    replyStyle: DEFAULT_REPLY_STYLE,
  };
}

function normalize(row: VisitorProfile | undefined): VisitorProfile {
  if (!row || typeof row !== "object") return emptyVisitorProfile();
  const ageConfirmed = row.ageConfirmed === true;
  const ageConfirmedAt =
    ageConfirmed && typeof row.ageConfirmedAt === "string" && row.ageConfirmedAt
      ? row.ageConfirmedAt
      : null;
  return {
    ageConfirmed,
    ageConfirmedAt,
    chatMode: effectiveStoredMode(coerceChatMode(row.chatMode), ageConfirmed),
    replyStyle: coerceReplyStyle(row.replyStyle),
  };
}

export async function readVisitorProfile(visitorId: string): Promise<VisitorProfile> {
  return store.enqueue(async () => {
    const data = await store.read();
    return normalize(data.visitors[visitorId]);
  });
}

export type ModeChangeInput = {
  confirmAge?: boolean;
  chatMode?: unknown;
  replyStyle?: unknown;
};

export type ModeChangeResult =
  | { ok: true; profile: VisitorProfile }
  | { ok: false; error: typeof NSFW_AGE_REQUIRED; profile: VisitorProfile };

/**
 * Persist age self-attestation, chat mode, and/or reply style.
 * NSFW is stored only after the visitor is age-confirmed on the server.
 */
export async function applyVisitorModeChange(
  visitorId: string,
  input: ModeChangeInput,
  now = new Date()
): Promise<ModeChangeResult> {
  return store.enqueue(async () => {
    const data = await store.read();
    const current = normalize(data.visitors[visitorId]);
    let next: VisitorProfile = { ...current };

    if (input.confirmAge === true && !next.ageConfirmed) {
      next = {
        ...next,
        ageConfirmed: true,
        ageConfirmedAt: now.toISOString(),
      };
    }

    if (input.chatMode !== undefined) {
      const mode = parseChatMode(input.chatMode);
      if (mode === "nsfw" && !next.ageConfirmed) {
        data.visitors[visitorId] = current;
        await store.persist(data);
        return { ok: false, error: NSFW_AGE_REQUIRED, profile: current };
      }
      if (mode) next = { ...next, chatMode: mode };
    }

    if (input.replyStyle !== undefined) {
      const style = parseReplyStyle(input.replyStyle);
      if (style) next = { ...next, replyStyle: style };
    }

    data.visitors[visitorId] = next;
    await store.persist(data);
    return { ok: true, profile: next };
  });
}

export function resetVisitorProfileMemory() {
  store.resetMemory();
}
