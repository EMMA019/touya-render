import { incrementAffinity, readAffinity, shouldIncrementAffinity } from "@/lib/affinity";
import { touchBond } from "@/lib/bond";
import { applyBibleFilter } from "@/lib/character-bible";
import { getCharacter } from "@/lib/characters";
import { evaluateChatGate } from "@/lib/chat-gate";
import {
  NSFW_AGE_REQUIRED,
  NSFW_AGE_REQUIRED_JA,
  resolveChatMode,
} from "@/lib/chat-mode";
import { demoFallbackEnabled, hasDeepseekKey } from "@/lib/config";
import { extractDelta, streamDeepseek } from "@/lib/deepseek";
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
    return Response.json({ error: "visitor_missing" }, { status: 400 });
  }

  const pace = checkRateLimit(visitorId);
  if (pace === "cooldown") {
    return Response.json({ error: "cooldown", message: "少し間を置いてね。" }, { status: 429 });
  }
  if (pace === "busy") {
    return Response.json({ error: "busy", message: "送りすぎです。1分待ってください。" }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const character = getCharacter(body.characterId ?? "");
  if (!character) {
    return Response.json({ error: "unknown_character" }, { status: 400 });
  }

  const history = trimHistory(Array.isArray(body.messages) ? body.messages : []);
  const userText = lastUserText(history);
  if (!userText) {
    return Response.json({ error: "empty" }, { status: 400 });
  }

  const profile = await readVisitorProfile(visitorId);
  const resolved = resolveChatMode({
    requested: body.mode,
    storedMode: profile.chatMode,
    ageConfirmed: profile.ageConfirmed,
  });
  if (!resolved.ok) {
    const mode = publicModeFromProfile(profile);
    return Response.json(
      { error: NSFW_AGE_REQUIRED, message: NSFW_AGE_REQUIRED_JA, ...mode, mode },
      { status: 403 }
    );
  }
  if (body.mode !== undefined && resolved.mode !== profile.chatMode) {
    await applyVisitorModeChange(visitorId, { chatMode: resolved.mode });
  }
  const chatMode = resolved.mode;
  const modePublic = publicModeFromProfile({ ...profile, chatMode });

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
      { headers: streamHeaders() }
    );
  }

  const useDemo = demoFallbackEnabled() && !hasDeepseekKey();
  const useLive = hasDeepseekKey();

  if (!useLive && !useDemo) {
    return Response.json(
      { error: "no_backend", message: "DEEPSEEK_API_KEY を設定してください。" },
      { status: 503 }
    );
  }

  const quota = await consumeTurn(visitorId);
  if (!quota.allowed) {
    return Response.json(
      {
        error: "quota",
        message: "本日の無料枠を使い切りました。日本時間の0時に回復します。広告を見て足すか、また明日どうぞ。",
        ...quota,
      },
      { status: 429 }
    );
  }

  // Cost-honest: one allowed send = one DeepSeek call. Memory is rules-only (no extra LLM, no supervisor).
  const extracted = extractMemoryFacts(userText);
  const facts = await rememberFacts(visitorId, character.id, extracted);
  const bond = await touchBond(visitorId, character.id, facts.length);
  const affinity = await incrementAffinity(visitorId, character.id);
  const situation = character.situations.find((row) => row.id === body.situationId);
  const systemPrompt = buildSystemPrompt(character, summarizeMemory(facts), situation, bond.stage, {
    clock: readClock(),
    daysAway: bond.daysAway,
    streak: bond.streak,
    remaining: quota.remaining,
    affinityName: affinity.name,
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
          const reply = applyBibleFilter(pickDemoReply(character, userText), character);
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

        const upstream = await streamDeepseek({
          systemPrompt,
          messages: history,
        });
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
                console.info(`[touya] ttft_ms=${firstTokenAt - started} character=${character.id}`);
              }
              assembled += delta;
              controller.enqueue(sse({ type: "delta", text: delta }));
            }
          }
        }

        const filtered = applyBibleFilter(assembled, character);
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

  return new Response(stream, { headers: streamHeaders() });
}

function streamHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };
}
