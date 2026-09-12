"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import { anonymousHeaders } from "@/lib/anonymous-client";
import type { ChatMode, ModePublic } from "@/lib/chat-mode";
import { DEFAULT_CHAT_MODE } from "@/lib/chat-mode";
import { ADS_ENABLED } from "@/lib/ads";

type ModeContextValue = ModePublic & {
  ready: boolean;
  ageGateOpen: boolean;
  openAgeGate: () => void;
  closeAgeGate: () => void;
  applyMode: (next: ChatMode) => Promise<ModePublic | null>;
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

  const postMode = useCallback(async (payload: { confirmAge?: boolean; chatMode?: ChatMode }) => {
    const response = await fetch(apiUrl("/api/mode"), {
      method: "POST",
      headers: anonymousHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as Partial<ModePublic> & {
      mode?: ModePublic;
      error?: string;
    };
    if (!response.ok) return null;
    const next = readBody(body);
    setState(next);
    return next;
  }, []);

  const applyMode = useCallback(
    async (next: ChatMode) => {
      if (next === "nsfw" && !state.ageConfirmed) {
        setAgeGateOpen(true);
        return null;
      }
      return postMode({ chatMode: next });
    },
    [postMode, state.ageConfirmed]
  );

  const confirmAgeAndEnableNsfw = useCallback(async () => {
    const next = await postMode({ confirmAge: true, chatMode: "nsfw" });
    if (next) setAgeGateOpen(false);
    return next;
  }, [postMode]);

  const leaveNsfw = useCallback(async () => postMode({ chatMode: "sfw" }), [postMode]);

  const value = useMemo<ModeContextValue>(
    () => ({
      ...state,
      ready,
      ageGateOpen,
      openAgeGate: () => setAgeGateOpen(true),
      closeAgeGate: () => setAgeGateOpen(false),
      applyMode,
      confirmAgeAndEnableNsfw,
      leaveNsfw,
    }),
    [state, ready, ageGateOpen, applyMode, confirmAgeAndEnableNsfw, leaveNsfw]
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
      openAgeGate: () => undefined,
      closeAgeGate: () => undefined,
      applyMode: async () => null,
      confirmAgeAndEnableNsfw: async () => null,
      leaveNsfw: async () => null,
    };
  }
  return ctx;
}
