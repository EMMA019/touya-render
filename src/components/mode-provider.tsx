"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import { anonymousHeaders } from "@/lib/anonymous-client";
import type { ChatMode, ModePublic } from "@/lib/chat-mode";
import {
  DEFAULT_CHAT_MODE,
  NSFW_AFFINITY_REQUIRED,
  NSFW_AFFINITY_REQUIRED_JA,
} from "@/lib/chat-mode";
import { ADS_ENABLED } from "@/lib/ads";

type NsfwContext = {
  characterId?: string;
  affinityLevel?: number;
};

type ModeContextValue = ModePublic & {
  ready: boolean;
  ageGateOpen: boolean;
  nsfwLockMessage: string | null;
  openAgeGate: (ctx?: NsfwContext) => void;
  closeAgeGate: () => void;
  applyMode: (next: ChatMode, ctx?: NsfwContext) => Promise<ModePublic | null>;
  confirmAgeAndEnableNsfw: () => Promise<ModePublic | null>;
  leaveNsfw: () => Promise<ModePublic | null>;
};

const fallback: ModePublic = {
  chatMode: DEFAULT_CHAT_MODE,
  ageConfirmed: false,
  ageConfirmedAt: null,
  adsEnabled: ADS_ENABLED,
};

const ModeContext = createContext<ModeContextValue | null>(null);

function readBody(body: Partial<ModePublic> & { mode?: ModePublic }): ModePublic {
  const nested = body.mode;
  return {
    chatMode: nested?.chatMode ?? body.chatMode ?? DEFAULT_CHAT_MODE,
    ageConfirmed: nested?.ageConfirmed ?? body.ageConfirmed === true,
    ageConfirmedAt: nested?.ageConfirmedAt ?? body.ageConfirmedAt ?? null,
    adsEnabled: nested?.adsEnabled ?? body.adsEnabled !== false,
  };
}

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModePublic>(fallback);
  const [ready, setReady] = useState(false);
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [nsfwLockMessage, setNsfwLockMessage] = useState<string | null>(null);
  const [pendingNsfw, setPendingNsfw] = useState<NsfwContext>({});

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/api/session"), { headers: anonymousHeaders() });
      const body = (await response.json()) as Partial<ModePublic> & { mode?: ModePublic };
      setState(readBody(body));
    } catch {
      setState(fallback);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const postMode = useCallback(async (payload: {
    confirmAge?: boolean;
    chatMode?: ChatMode;
    characterId?: string;
  }) => {
    const response = await fetch(apiUrl("/api/mode"), {
      method: "POST",
      headers: anonymousHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as Partial<ModePublic> & {
      mode?: ModePublic;
      error?: string;
      message?: string;
    };
    if (!response.ok) {
      if (body.error === NSFW_AFFINITY_REQUIRED) {
        setNsfwLockMessage(body.message ?? NSFW_AFFINITY_REQUIRED_JA);
      }
      if (body.chatMode || body.mode) setState(readBody(body));
      return null;
    }
    const next = readBody(body);
    setState(next);
    setNsfwLockMessage(null);
    return next;
  }, []);

  const applyMode = useCallback(
    async (next: ChatMode, ctx?: NsfwContext) => {
      if (ctx) setPendingNsfw(ctx);
      if (next === "nsfw" && !state.ageConfirmed) {
        setAgeGateOpen(true);
        return null;
      }
      return postMode({
        chatMode: next,
        characterId: ctx?.characterId ?? pendingNsfw.characterId,
      });
    },
    [postMode, state.ageConfirmed, pendingNsfw.characterId]
  );

  const confirmAgeAndEnableNsfw = useCallback(async () => {
    const next = await postMode({
      confirmAge: true,
      chatMode: "nsfw",
      characterId: pendingNsfw.characterId,
    });
    if (next) setAgeGateOpen(false);
    return next;
  }, [postMode, pendingNsfw.characterId]);

  const leaveNsfw = useCallback(async () => postMode({ chatMode: "sfw" }), [postMode]);

  const value = useMemo<ModeContextValue>(
    () => ({
      ...state,
      ready,
      ageGateOpen,
      nsfwLockMessage,
      openAgeGate: (ctx) => {
        if (ctx) setPendingNsfw(ctx);
        setAgeGateOpen(true);
      },
      closeAgeGate: () => setAgeGateOpen(false),
      applyMode,
      confirmAgeAndEnableNsfw,
      leaveNsfw,
    }),
    [state, ready, ageGateOpen, nsfwLockMessage, applyMode, confirmAgeAndEnableNsfw, leaveNsfw]
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useChatMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    return {
      ...fallback,
      ready: false,
      ageGateOpen: false,
      nsfwLockMessage: null,
      openAgeGate: () => undefined,
      closeAgeGate: () => undefined,
      applyMode: async () => null,
      confirmAgeAndEnableNsfw: async () => null,
      leaveNsfw: async () => null,
    };
  }
  return ctx;
}
