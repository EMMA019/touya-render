"use client";

import { Bookmark, ChevronLeft, Lock, MessageCircle, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AffinityLevelBanner, AffinityToast } from "@/components/affinity-feedback";
import { AffinityHeart } from "@/components/affinity-heart";
import { BondLamp } from "@/components/bond-lamp";
import { MemorySheet } from "@/components/memory-sheet";
import type { UiMessage } from "@/components/message-bubble";
import { ModeToggle } from "@/components/mode-toggle";
import { useChatMode } from "@/components/mode-provider";
import { PortraitStage } from "@/components/portrait-stage";
import { RewardedAdButton } from "@/components/rewarded-ad-button";
import { DebugUnlimitedMark } from "@/components/quota-pill";
import { SituationSceneCard } from "@/components/situation-scene-card";
import { apiUrl } from "@/lib/api-base";
import { anonymousHeaders } from "@/lib/anonymous-client";
import type { Bond, BondStage } from "@/lib/bond-types";
import { situationGreeting, type CharacterPublic } from "@/lib/character-types";
import { EMPTY_AFFINITY, type AffinityPublic } from "@/lib/affinity-types";
import {
  clearHook,
  loadChat,
  loadHook,
  loadLastVisitDay,
  markVisit,
  saveChat,
  saveHook,
} from "@/lib/chat-history";
import { readClock } from "@/lib/clock";
import type { MemoryRow } from "@/lib/memory-types";
import { MAX_MESSAGE_CHARS, jstDayKey } from "@/lib/config";
import { classifyExpression } from "@/lib/expression";
import { composeOpening, pickHook, suggestionsFor } from "@/lib/presence";
import type { Quota } from "@/lib/quota-types";
import { isMobileChatInput, resizeComposer } from "@/lib/chat-composer";
import { seedSituationGreeting } from "@/lib/situation-greeting";
import { situationIcon } from "@/lib/situation-icons";
import { LOCKED_SITUATION_HINT, unlockedSituationIds } from "@/lib/situation-unlock";
import { cn } from "@/lib/utils";

export function ChatView({
  character,
  initialQuota,
  initialBond,
  initialMemory,
  initialUnlocked,
  initialAffinity,
}: {
  character: CharacterPublic;
  initialQuota: Quota;
  initialBond: Bond;
  initialMemory: MemoryRow[];
  initialUnlocked: string[];
  initialAffinity: AffinityPublic;
}) {
  const { chatMode, adsEnabled } = useChatMode();
  const firstOpen = character.situations.find((scene) => initialUnlocked.includes(scene.id))?.id;
  const initialSituation =
    character.situations.find((scene) => scene.id === firstOpen) ?? character.situations[0];
  const opening = composeOpening({
    id: character.id,
    greeting: situationGreeting(initialSituation, character.greeting),
    welcomeBack: character.welcomeBack,
    presence: character.presence,
    clock: readClock(),
    stage: initialBond.stage,
    daysAway: initialBond.daysAway,
    streak: initialBond.streak,
    firstVisit: initialBond.daysMet <= 1 && initialBond.daysAway === 0,
  });
  const [messages, setMessages] = useState<UiMessage[]>([
    { id: "greeting", role: "assistant", content: opening.text },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(initialQuota);
  const [bond, setBond] = useState<Bond>(initialBond);
  const [memory, setMemory] = useState<MemoryRow[]>(initialMemory);
  const [unlocked, setUnlocked] = useState<string[]>(initialUnlocked);
  const [affinity, setAffinity] = useState<AffinityPublic>(initialAffinity ?? EMPTY_AFFINITY);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  const [affinityToast, setAffinityToast] = useState<string | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [situationId, setSituationId] = useState(firstOpen ?? character.situations[0]?.id ?? "");
  const [cardOpen, setCardOpen] = useState(true);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const limited = !quota.debugUnlimited && quota.remaining <= 0;
  const situation = character.situations.find((row) => row.id === situationId);
  const recent = messages.slice(-5);
  const lastAssistant = [...messages].reverse().find((row) => row.role === "assistant" && row.content);
  const expression = classifyExpression(lastAssistant?.content ?? character.greeting);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!levelUpMessage) return;
    const timer = window.setTimeout(() => setLevelUpMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [levelUpMessage]);

  useEffect(() => {
    if (!affinityToast) return;
    const timer = window.setTimeout(() => setAffinityToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [affinityToast]);

  useEffect(() => {
    resizeComposer(boxRef.current);
  }, []);

  useEffect(() => {
    const saved = loadChat(character.id);
    const lastDay = loadLastVisitDay(character.id);
    const today = jstDayKey();
    const hook = lastDay && lastDay !== today ? loadHook(character.id) : null;
    const nextOpening = composeOpening({
      id: character.id,
      greeting: situationGreeting(initialSituation, character.greeting),
      welcomeBack: character.welcomeBack,
      presence: character.presence,
      clock: readClock(),
      stage: bond.stage,
      daysAway: lastDay && lastDay !== today ? Math.max(initialBond.daysAway, 1) : 0,
      streak: initialBond.streak,
      hook,
      firstVisit: saved.length === 0 && !lastDay,
    });
    if (saved.length > 0) {
      const next =
        lastDay && lastDay !== today
          ? [...saved, { id: `welcome-${today}`, role: "assistant" as const, content: nextOpening.text }]
          : saved;
      setMessages(next);
      if (lastDay !== today) clearHook(character.id);
    } else {
      setMessages([{ id: "greeting", role: "assistant", content: nextOpening.text }]);
    }
    markVisit(character.id);
    setHydrated(true);
  }, [character, bond.stage, initialBond.daysAway, initialBond.streak, initialSituation]);

  useEffect(() => {
    if (hydrated) saveChat(character.id, messages);
  }, [character.id, hydrated, messages]);

  useEffect(() => {
    setUnlocked(unlockedSituationIds(character.situations, bond.daysMet, new Date(), affinity.level));
  }, [character.situations, bond.daysMet, affinity.level]);

  useEffect(() => {
    void fetch(apiUrl("/api/session"), { headers: anonymousHeaders() })
      .then((response) => response.json())
      .then((body: { quota?: Quota }) => {
        if (body.quota) setQuota(body.quota);
      })
      .catch(() => undefined);
    void fetch(apiUrl(`/api/companion?characterId=${character.id}`), { headers: anonymousHeaders() })
      .then((response) => response.json())
      .then((body: { bond?: Bond; memory?: MemoryRow[]; unlocked?: string[]; affinity?: AffinityPublic }) => {
        if (body.bond) setBond(body.bond);
        if (body.memory) setMemory(body.memory);
        if (body.unlocked) setUnlocked(body.unlocked);
        if (body.affinity) setAffinity(body.affinity);
      })
      .catch(() => undefined);
  }, [character.id]);

  const historyPayload = useMemo(
    () => messages.map(({ role, content }) => ({ role, content })),
    [messages]
  );

  function selectSituation(id: string) {
    const scene = character.situations.find((row) => row.id === id);
    if (!scene || !unlocked.includes(id)) return;
    if (id === situationId) {
      setCardOpen(true);
      return;
    }
    setSituationId(id);
    setCardOpen(true);
    setMessages((prev) =>
      seedSituationGreeting(prev, id, situationGreeting(scene, character.greeting)),
    );
  }

  async function send(text?: string) {
    const trimmed = (text ?? boxRef.current?.value ?? "")
      .trim()
      .slice(0, MAX_MESSAGE_CHARS);
    if (sending) return;
    if (limited) {
      setError(character.farewell);
      return;
    }
    if (!trimmed) {
      setError("…");
      return;
    }

    seq.current += 1;
    const userId = `u-${seq.current}`;
    seq.current += 1;
    const assistantId = `a-${seq.current}`;
    setError(null);
    setFeedbackSent(false);
    setCardOpen(false);
    setSending(true);
    if (boxRef.current) {
      boxRef.current.value = "";
      resizeComposer(boxRef.current);
    }
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: trimmed },
      { id: assistantId, role: "assistant", content: "", pending: true },
    ]);

    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: anonymousHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          characterId: character.id,
          situationId,
          mode: chatMode,
          messages: [...historyPayload, { role: "user", content: trimmed }],
        }),
      });

      if (response.status === 429) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
          remaining?: number;
          used?: number;
          limit?: number;
          error?: string;
        };
        if (body.error === "quota" || body.remaining === 0) {
          setQuota((prev) => ({
            ...prev,
            remaining: 0,
            used: body.used ?? prev.used,
            limit: body.limit ?? prev.limit,
          }));
          throw new Error(character.farewell);
        }
        throw new Error(body.message ?? "少し待ってから。");
      }

      if (response.status === 403) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "18歳以上の確認が必要です。");
      }

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? character.offline);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let carry = "";
      let assembled = "";
      let remainingAfter = quota.remaining;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        carry += decoder.decode(value, { stream: true });
        const chunks = carry.split("\n\n");
        carry = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          const payload = JSON.parse(line.slice(5).trim()) as {
            type: string;
            text?: string;
            remaining?: number;
            used?: number;
            limit?: number;
            extra?: number;
            premium?: boolean;
            rewardsLeft?: number;
            debugUnlimited?: boolean;
            day?: string;
            message?: string;
            stage?: BondStage;
            daysMet?: number;
            factCount?: number;
            lastDay?: string | null;
            firstDay?: string | null;
            streak?: number;
            daysAway?: number;
            count?: number;
            name?: string;
            nextAt?: number | null;
            progress?: number;
            remainingToNext?: number | null;
            affinityDelta?: number;
            leveledUp?: boolean;
            levelUpMessage?: string | null;
            affinityToast?: string | null;
            bandEvent?: { title?: string; blurb?: string } | null;
            level?: number | string;
          };
          if (payload.type === "quota" && typeof payload.remaining === "number") {
            remainingAfter = payload.remaining;
            setQuota((prev) => ({
              ...prev,
              remaining: payload.remaining ?? prev.remaining,
              used: payload.used ?? prev.used,
              limit: payload.limit ?? prev.limit,
              extra: typeof payload.extra === "number" ? payload.extra : prev.extra,
              premium: typeof payload.premium === "boolean" ? payload.premium : prev.premium,
              rewardsLeft:
                typeof payload.rewardsLeft === "number" ? payload.rewardsLeft : prev.rewardsLeft,
              day: payload.day ?? prev.day,
              debugUnlimited:
                typeof payload.debugUnlimited === "boolean"
                  ? payload.debugUnlimited
                  : prev.debugUnlimited,
            }));
          }
          if (payload.type === "bond" && payload.stage) {
            setBond({
              stage: payload.stage,
              daysMet: payload.daysMet ?? bond.daysMet,
              factCount: payload.factCount ?? bond.factCount,
              lastDay: payload.lastDay ?? bond.lastDay,
              firstDay: payload.firstDay ?? bond.firstDay,
              streak: typeof payload.streak === "number" ? payload.streak : bond.streak,
              daysAway: typeof payload.daysAway === "number" ? payload.daysAway : bond.daysAway,
            });
          }
          if (payload.type === "affinity" && typeof payload.name === "string") {
            setAffinity({
              count: typeof payload.count === "number" ? payload.count : 0,
              level: typeof payload.level === "number" ? payload.level : 0,
              name: payload.name,
              nextAt: typeof payload.nextAt === "number" ? payload.nextAt : null,
              progress: typeof payload.progress === "number" ? payload.progress : 0,
              remainingToNext:
                typeof payload.remainingToNext === "number" ? payload.remainingToNext : null,
            });
            if (payload.leveledUp && payload.levelUpMessage) {
              setLevelUpMessage(payload.levelUpMessage);
              setAffinityToast(null);
            } else if (payload.affinityToast) {
              setLevelUpMessage(null);
              setAffinityToast(payload.affinityToast);
            }
          }
          if (payload.type === "delta" && payload.text) {
            assembled += payload.text;
            const snapshot = assembled;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: snapshot, pending: true } : m
              )
            );
          }
          if (payload.type === "replace" && payload.text) {
            assembled = payload.text;
            const snapshot = assembled;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: snapshot, pending: true } : m
              )
            );
          }
          if (payload.type === "error") {
            throw new Error(payload.message ?? character.offline);
          }
        }
      }

      setMessages((prev) => {
        const done = prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m));
        const reply = done.find((m) => m.id === assistantId)?.content ?? assembled;
        if (remainingAfter <= 1 && reply) {
          saveHook(character.id, reply);
        }
        return done;
      });
      void fetch(apiUrl(`/api/memory?characterId=${character.id}`), { headers: anonymousHeaders() })
        .then((response) => response.json())
        .then((body: { facts?: MemoryRow[] }) => {
          if (body.facts) setMemory(body.facts);
        })
        .catch(() => undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : character.offline;
      setError(message);
      setMessages((prev) => {
        const withoutEmpty = prev.filter(
          (m) => !(m.id === assistantId && m.content === "")
        );
        return withoutEmpty.map((m) =>
          m.id === assistantId ? { ...m, pending: false } : m
        );
      });
    } finally {
      setSending(false);
    }
  }

  async function forget(text: string) {
    const response = await fetch(apiUrl("/api/memory"), {
      method: "DELETE",
      headers: anonymousHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ characterId: character.id, text }),
    });
    const body = (await response.json().catch(() => ({}))) as { facts?: MemoryRow[] };
    if (body.facts) setMemory(body.facts);
  }

  async function reportWrong() {
    if (!lastAssistant || feedbackSent) return;
    await fetch(apiUrl("/api/feedback"), {
      method: "POST",
      headers: anonymousHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        characterId: character.id,
        situationId,
        assistantText: lastAssistant.content,
      }),
    }).catch(() => undefined);
    setFeedbackSent(true);
  }

  return (
    <div className="relative mx-auto h-svh w-full max-w-md overflow-hidden bg-black md:max-w-lg">
      <PortraitStage
        key={situationId}
        character={character}
        situation={situation}
        expression={expression}
        className="absolute inset-0"
      />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            href="/"
            aria-label="戻る"
            className="grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-1.5">
            <AffinityHeart affinity={affinity} />
            <BondLamp stage={bond.stage} />
            <button
              type="button"
              aria-label="覚えていること"
              onClick={() => setMemoryOpen(true)}
              className="grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
            >
              <Bookmark className="size-4" />
            </button>
            <ModeToggle compact />
            <div
              className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-white backdrop-blur-md"
              title="今日の残り"
            >
              <MessageCircle className="size-3.5 opacity-80" />
              <span className="font-mono text-sm tabular-nums">
                {quota.debugUnlimited ? "∞" : quota.remaining}
              </span>
              <DebugUnlimitedMark on={quota.debugUnlimited} />
            </div>
          </div>
        </header>

        {levelUpMessage ? (
          <AffinityLevelBanner message={levelUpMessage} onDismiss={() => setLevelUpMessage(null)} />
        ) : affinityToast ? (
          <AffinityToast message={affinityToast} />
        ) : null}

        <div className="mt-3 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none]">
          {character.situations.map((scene) => {
            const Icon = situationIcon(scene.id, scene.season, scene.costume);
            const open = unlocked.includes(scene.id);
            return (
              <button
                key={scene.id}
                type="button"
                disabled={!open}
                onClick={() => open && selectSituation(scene.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] backdrop-blur-md",
                  !open && "opacity-50",
                  situationId === scene.id
                    ? "bg-white/90 text-stone-900"
                    : "bg-black/40 text-white/80"
                )}
              >
                {open ? <Icon className="size-3" /> : <Lock className="size-3" />}
                {scene.title}
                {!open ? <span className="text-[10px] opacity-80">{LOCKED_SITUATION_HINT}</span> : null}
              </button>
            );
          })}
        </div>

        {cardOpen ? (
          <SituationSceneCard
            situation={situation}
            level={affinity.level}
            onDismiss={() => setCardOpen(false)}
          />
        ) : null}

        <div ref={scroller} className="mt-auto min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-2">
          {recent.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[86%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap backdrop-blur-md",
                message.role === "user"
                  ? "ml-auto bg-white/90 text-stone-900"
                  : "bg-black/45 text-white"
              )}
            >
              {message.content}
              {message.pending ? <span className="ml-1 animate-pulse">▍</span> : null}
            </div>
          ))}
          {lastAssistant && !lastAssistant.pending ? (
            <button
              type="button"
              onClick={() => void reportWrong()}
              className="block text-[10px] text-white/45 underline-offset-2 hover:underline"
            >
              {feedbackSent ? "フィードバックを受け付けました。改善の参考にします。" : "返答に違和感がある場合"}
            </button>
          ) : null}
        </div>

        {limited ? (
          <div className="mx-3 mb-2 space-y-2 rounded-2xl bg-black/55 p-3 text-xs text-white backdrop-blur-md">
            <p className="text-sm leading-relaxed">
              「{character.farewell}
              {` ${pickHook(character.presence, `${character.id}-hook`, "")}`}」
            </p>
      {adsEnabled ? (
        <RewardedAdButton
          rewardsLeft={quota.rewardsLeft}
          onGranted={(next) => setQuota(next)}
        />
      ) : null}
      {adsEnabled ? (
      <Link href="/premium" className="block text-center text-[11px] text-white/60 underline-offset-2 hover:underline">
        広告を非表示にして話す
      </Link>
      ) : null}
    </div>
  ) : null}

        {error ? (
          <p className="px-4 pb-1 text-center text-[11px] text-rose-200" role="alert">
            {error}
          </p>
        ) : null}

        <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mb-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {suggestionsFor(character.presence, bond.stage, character.suggestions).map((hint) => (
              <button
                key={hint}
                type="button"
                disabled={sending || limited}
                onClick={() => void send(hint)}
                className="shrink-0 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur-md disabled:opacity-40"
              >
                {hint}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              ref={boxRef}
              rows={1}
              disabled={sending || limited}
              maxLength={MAX_MESSAGE_CHARS}
              placeholder="…"
              onInput={(event) => resizeComposer(event.currentTarget)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                if (isMobileChatInput()) return;
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(event.currentTarget.value);
                }
              }}
              className="min-h-[28px] max-h-[160px] w-full resize-none overflow-y-auto rounded-full border-0 bg-black/45 px-4 py-2.5 text-sm leading-relaxed text-white outline-none backdrop-blur-md placeholder:text-white/35"
            />
            <button
              type="button"
              disabled={sending || limited}
              aria-label="送信"
              onClick={() => void send()}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-stone-900 disabled:opacity-40"
            >
              <SendHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <MemorySheet
        open={memoryOpen}
        facts={memory}
        onClose={() => setMemoryOpen(false)}
        onForget={(text) => void forget(text)}
      />
    </div>
  );
}
