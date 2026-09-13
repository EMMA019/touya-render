import { incrementAffinity, readAffinity, shouldIncrementAffinity } from "@/lib/affinity";
import { touchBond } from "@/lib/bond";
import { applyBibleFilter } from "@/lib/character-bible";
import { getCharacter } from "@/lib/characters";
import { resolveChatBackend } from "@/lib/chat-backend";
import { evaluateChatGate } from "@/lib/chat-gate";
import {
  NSFW_MIN_AFFINITY_LEVEL,
  nsfwDenialMessage,
  resolveChatMode,
} from "@/lib/chat-mode";
import { isSituationUnlocked } from "@/lib/situation-unlock";
import {
  OPENROUTER_MISSING_JA,
  demoFallbackEnabled,
  hasDeepseekKey,
  hasOpenRouterKey,
} from "@/lib/config";
import { applyCors, corsHeaders, jsonApi } from "@/lib/cors";
import { extractDelta, streamDeepseek } from "@/lib/deepseek";
import { streamOpenRouter } from "@/lib/openrouter";
import { pickDemoReply, streamText } from "@/lib/demo";
import { extractMemoryFacts } from "@/lib/memory-extract";
import { rememberFacts } from "@/lib/memory-store";
import { summarizeMemory } from "@/lib/memory-summary";
import { lastUserText, trimHistory, type ChatTurn } from "@/lib/messages";
import { publicModeFromProfile } from "@/lib/mode-public";
import { isSexualOutput } from "@/lib/output-moderation";
import { buildSystemPrompt } from "@/lib/prompt";
import { checkRateLimit } from "@/lib/rate-limit";
import { refusalText } from "@/lib/sexual-refusals";
import { bumpSexualStrike, readSexualStrike } from "@/lib/sexual-strikes";
import { consumeTurn, readQuota } from "@/lib/usage";
import { getVisitorId } from "@/lib/visitor";
import { applyVisitorModeChange, readVisitorProfile } from "@/lib/visitor-profile";
import { readClock } from "@/lib/clock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export { OPTIONS } from "@/lib/cors";

type Body = {
  characterId?: string;
  situationId?: string;
  messages?: ChatTurn[];
  mode?: unknown;
};

function sse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) {
    return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  }

  const pace = checkRateLimit(visitorId);
  if (pace === "cooldown") {
    return jsonApi(request, { error: "cooldown", message: "少し間を置いてね。" }, { status: 429 });
  }
  if (pace === "busy") {
    return jsonApi(request, { error: "busy", message: "送りすぎです。1分待ってください。" }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonApi(request, { error: "invalid_json" }, { status: 400 });
  }

  const character = getCharacter(body.characterId ?? "");
  if (!character) {
    return jsonApi(request, { error: "unknown_character" }, { status: 400 });
  }

  const history = trimHistory(Array.isArray(body.messages) ? body.messages : []);
  const userText = lastUserText(history);
  if (!userText) {
    return jsonApi(request, { error: "empty" }, { status: 400 });
  }

  const profile = await readVisitorProfile(visitorId);
  const affinityNow = await readAffinity(visitorId, character.id);
  const resolved = resolveChatMode({
    requested: body.mode,
    storedMode: profile.chatMode,
    ageConfirmed: profile.ageConfirmed,
    affinityLevel: affinityNow.level,
  });
  if (!resolved.ok) {
    const mode = publicModeFromProfile(profile, affinityNow.level);
    return jsonApi(
      request,
      {
        error: resolved.error,
        message: nsfwDenialMessage(resolved.error),
        ...mode,
        mode,
      },
      { status: 403 }
    );
  }
  if (
    body.mode !== undefined &&
    resolved.mode !== profile.chatMode &&
    (resolved.mode === "sfw" || affinityNow.level >= NSFW_MIN_AFFINITY_LEVEL)
  ) {
    await applyVisitorModeChange(visitorId, {
      chatMode: resolved.mode,
      affinityLevel: affinityNow.level,
    });
  }
  const chatMode = resolved.mode;
  const modePublic = publicModeFromProfile({ ...profile, chatMode }, affinityNow.level);
  const nsfwAllowed = chatMode === "nsfw";

  const strike = await readSexualStrike(visitorId, character.id);
  const gate = evaluateChatGate({
    text: userText,
    history,
    style: character.refusalStyle,
    strike,
    mode: chatMode,
  });

  if (!gate.callModel) {
    if (gate.reason === "sexual") {
      await bumpSexualStrike(visitorId, character.id);
    }
    const quota =
      gate.reason === "sexual_block"
        ? await readQuota(visitorId)
        : await consumeTurn(visitorId);
    const consumedTurn =
      gate.reason !== "sexual_block" && "allowed" in quota && quota.allowed === true;
    const affinity = shouldIncrementAffinity({ consumedTurn })
      ? await incrementAffinity(visitorId, character.id)
      : await readAffinity(visitorId, character.id);

    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(sse({ type: "quota", ...quota }));
          controller.enqueue(sse({ type: "affinity", ...affinity }));
          controller.enqueue(sse({ type: "mode", ...modePublic }));
          controller.enqueue(
            sse({
              type: "gate",
              reason: gate.reason,
              skipApi: true,
              level: "level" in gate ? gate.level : undefined,
              mode: chatMode,
            })
          );
          controller.enqueue(sse({ type: "delta", text: gate.text }));
          controller.enqueue(sse({ type: "done", gated: true }));
          controller.close();
        },
      }),
      { headers: streamHeaders(request) }
    );
  }

  const backend = resolveChatBackend({
    mode: chatMode,
    hasDeepseekKey: hasDeepseekKey(),
    hasOpenRouterKey: hasOpenRouterKey(),
    demoEnabled: demoFallbackEnabled(),
  });
  if (!backend.ok) {
    if (backend.error === "openrouter_missing") {
      return jsonApi(
        request,
        { error: "openrouter_missing", message: OPENROUTER_MISSING_JA },
        { status: 503 }
      );
    }
    return jsonApi(
      request,
      { error: "no_backend", message: "DEEPSEEK_API_KEY を設定してください。" },
      { status: 503 }
    );
  }
  const liveBackend = backend.backend;
  const useDemo = liveBackend === "demo";

  const quota = await consumeTurn(visitorId);
  if (!quota.allowed) {
    return jsonApi(
      request,
      {
        error: "quota",
        message: "本日の無料枠を使い切りました。日本時間の0時に回復します。広告を見て足すか、また明日どうぞ。",
        ...quota,
      },
      { status: 429 }
    );
  }

  // Cost-honest: one allowed send = one LLM call. Memory is rules-only (no extra LLM, no supervisor).
  const extracted = extractMemoryFacts(userText);
  const facts = await rememberFacts(visitorId, character.id, extracted);
  const bond = await touchBond(visitorId, character.id, facts.length);
  const affinity = await incrementAffinity(visitorId, character.id);
  const requestedSituation = character.situations.find((row) => row.id === body.situationId);
  const situation =
    requestedSituation &&
    isSituationUnlocked(
      requestedSituation,
      bond.daysMet,
      new Date(),
      affinityNow.level,
      nsfwAllowed,
    )
      ? requestedSituation
      : undefined;
  const systemPrompt = buildSystemPrompt(character, summarizeMemory(facts), situation, bond.stage, {
    clock: readClock(),
    daysAway: bond.daysAway,
    streak: bond.streak,
    remaining: quota.remaining,
    affinityName: affinity.name,
    chatMode,
  });

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse({ type: "quota", ...quota }));
      controller.enqueue(sse({ type: "bond", ...bond }));
      controller.enqueue(sse({ type: "affinity", ...affinity }));
      controller.enqueue(sse({ type: "mode", ...modePublic }));
      const started = Date.now();
      let firstTokenAt: number | null = null;
      let assembled = "";
      try {
        if (useDemo) {
          const reply = applyBibleFilter(pickDemoReply(character, userText), character, chatMode, userText);
          const safe =
            chatMode === "sfw" && isSexualOutput(reply)
              ? refusalText(character.refusalStyle, 2)
              : reply;
          for await (const chunk of streamText(safe)) {
            assembled += chunk;
            if (firstTokenAt === null) {
              firstTokenAt = Date.now();
              console.info(`[touya] ttft_ms=${firstTokenAt - started} character=${character.id} demo=1`);
            }
            controller.enqueue(sse({ type: "delta", text: chunk }));
          }
          controller.enqueue(sse({ type: "done", demo: true }));
          controller.close();
          return;
        }

        const upstream =
          liveBackend === "openrouter"
            ? await streamOpenRouter({ systemPrompt, messages: history })
            : await streamDeepseek({ systemPrompt, messages: history });
        const reader = upstream.getReader();
        const decoder = new TextDecoder();
        let carry = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          carry += decoder.decode(value, { stream: true });
          const lines = carry.split("\n");
          carry = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            const delta = extractDelta(payload);
            if (delta) {
              if (firstTokenAt === null) {
                firstTokenAt = Date.now();
                console.info(
                  `[touya] ttft_ms=${firstTokenAt - started} character=${character.id} backend=${liveBackend}`
                );
              }
              assembled += delta;
              controller.enqueue(sse({ type: "delta", text: delta }));
            }
          }
        }

        const filtered = applyBibleFilter(assembled, character, chatMode, userText);
        if (chatMode === "sfw" && isSexualOutput(filtered)) {
          controller.enqueue(
            sse({
              type: "replace",
              text: refusalText(character.refusalStyle, 2),
            })
          );
        } else if (filtered !== assembled) {
          controller.enqueue(sse({ type: "replace", text: filtered }));
        }

        controller.enqueue(sse({ type: "done" }));
        controller.close();
      } catch (error) {
        if (!assembled) {
          controller.enqueue(sse({ type: "delta", text: character.offline }));
          controller.enqueue(sse({ type: "done", offline: true }));
          controller.close();
          return;
        }
        const message =
          error instanceof Error ? error.message : "upstream_failed";
        controller.enqueue(sse({ type: "error", message }));
        controller.close();
      }
    },
  });

  return applyCors(new Response(stream, { headers: streamHeaders(request) }), request);
}

function streamHeaders(request: Request): Headers {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "text/event-stream; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");
  return headers;
}
