import "server-only";
import { readAffinity } from "./affinity";
import { readBond } from "./bond";
import { getCharacter, getPublicCharacter } from "./characters";
import { loadStoryState } from "./companion";
import { jsonApi } from "./cors";
import { rememberFacts } from "./memory-store";
import { checkRateLimit } from "./rate-limit";
import { advanceBeat, applyChoice, updateStory } from "./story";
import { getStoryScript, toPublicBeat } from "./story-script";
import type { StoryBeat } from "./story-types";
import { getVisitorId } from "./visitor";

/**
 * Shared body of POST /api/story/choice and /api/story/advance.
 * No LLM, no consumeTurn, no incrementAffinity — only the story record moves.
 */
type StoryBody = { characterId?: string; chapterId?: string; beatId?: string; choiceId?: string };

export async function handleStoryStep(request: Request, step: "choice" | "advance"): Promise<Response> {
  const visitorId = await getVisitorId();
  if (!visitorId) return jsonApi(request, { error: "visitor_missing" }, { status: 400 });
  // Taps come faster than chat sends; only the per-minute burst cap applies here.
  if (checkRateLimit(visitorId) === "busy") {
    return jsonApi(request, { error: "busy", message: "少し間を置いてね。" }, { status: 429 });
  }
  let body: StoryBody;
  try {
    body = (await request.json()) as StoryBody;
  } catch {
    return jsonApi(request, { error: "invalid_json" }, { status: 400 });
  }
  const character = getCharacter(body.characterId ?? "");
  const publicCharacter = getPublicCharacter(body.characterId ?? "");
  if (!character || !publicCharacter) return jsonApi(request, { error: "unknown_character" }, { status: 400 });
  const script = getStoryScript(character.id);
  const chapterId = String(body.chapterId ?? "");
  const beatId = String(body.beatId ?? "");
  if (!script || !chapterId || !beatId) return jsonApi(request, { error: "story_out_of_step" }, { status: 400 });
  const affinity = await readAffinity(visitorId, character.id);

  let failure: string | null = null;
  let nextBeat: StoryBeat | null = null;
  let remember: string | null = null;
  const now = new Date();
  await updateStory(visitorId, character.id, (record) => {
    if (step === "choice") {
      const result = applyChoice(record, script, chapterId, beatId, String(body.choiceId ?? ""), affinity.count, now);
      if (!result.ok) {
        failure = result.error;
        return record;
      }
      nextBeat = result.next;
      remember = result.choice.remember?.trim() || null;
      return result.record;
    }
    const result = advanceBeat(record, script, chapterId, beatId, affinity.count, now);
    if (!result.ok) {
      failure = result.error;
      return record;
    }
    nextBeat = result.next;
    return result.record;
  });
  if (failure) return jsonApi(request, { error: failure }, { status: 400 });

  const memory = remember
    ? await rememberFacts(visitorId, character.id, [{ kind: "relationship", text: remember }], now)
    : null;
  const bond = await readBond(visitorId, character.id, memory?.length ?? 0, now);
  const state = await loadStoryState(visitorId, character.id, publicCharacter.situations, affinity, bond, { now });
  return jsonApi(request, {
    story: state.story,
    beat: nextBeat ? toPublicBeat(nextBeat) : null,
    script: state.script,
    unlocked: state.unlocked,
    locks: state.locks,
    ...(memory ? { memory: memory.map(({ kind, text, at }) => ({ kind, text, at })) } : {}),
  });
}
