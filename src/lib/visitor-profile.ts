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

export type VisitorProfile = {
  ageConfirmed: boolean;
  ageConfirmedAt: string | null;
  chatMode: ChatMode;
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
};

export type ModeChangeResult =
  | { ok: true; profile: VisitorProfile }
  | { ok: false; error: typeof NSFW_AGE_REQUIRED; profile: VisitorProfile };

/**
 * Persist age self-attestation and/or chat mode.
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

    data.visitors[visitorId] = next;
    await store.persist(data);
    return { ok: true, profile: next };
  });
}

export function resetVisitorProfileMemory() {
  store.resetMemory();
}
