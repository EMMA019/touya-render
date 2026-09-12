import { checkUserSafety, SAFETY_REFUSAL_JA } from "./safety";
import { classifySexualIntent } from "./sexual-intent";
import {
  SEXUAL_BLOCK_TEXT,
  refusalText,
  type RefusalStyle,
  type SexualLevel,
} from "./sexual-refusals";
import type { ChatTurn } from "./messages";
import type { StrikeState } from "./sexual-strikes";

export type ChatGate =
  | { callModel: false; reason: "minor_sexual"; text: string }
  | {
      callModel: false;
      reason: "sexual";
      text: string;
      level: SexualLevel;
      shouldBlock: boolean;
    }
  | { callModel: false; reason: "sexual_block"; text: string }
  | { callModel: true };

/**
 * Central pre-LLM gate. If this returns callModel:false, DeepSeek must not run.
 */
export function evaluateChatGate(input: {
  text: string;
  history: ChatTurn[];
  style: RefusalStyle;
  strike: StrikeState;
}): ChatGate {
  if (input.strike.blocked) {
    return { callModel: false, reason: "sexual_block", text: SEXUAL_BLOCK_TEXT };
  }

  const safety = checkUserSafety(input.text);
  if (!safety.ok && safety.reason === "minor_sexual") {
    return { callModel: false, reason: "minor_sexual", text: SAFETY_REFUSAL_JA };
  }
  if (!safety.ok) {
    return { callModel: false, reason: "minor_sexual", text: SAFETY_REFUSAL_JA };
  }

  const intent = classifySexualIntent(input.text, input.history);
  if (intent.sexual) {
    const level = Math.min(3, input.strike.count + 1) as SexualLevel;
    return {
      callModel: false,
      reason: "sexual",
      text: refusalText(input.style, level),
      level,
      shouldBlock: level >= 3,
    };
  }

  return { callModel: true };
}
