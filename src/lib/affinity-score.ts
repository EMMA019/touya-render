import { clampAffinityDelta, type AffinityDelta } from "./affinity-types";
import { DEFAULT_CHAT_MODE, type ChatMode } from "./chat-mode";
import { classifySexualIntent } from "./sexual-intent";

const INSULT =
  /馬鹿|バカ|アホ|死ね|くそ|クソ|うざ|ウザい|きもい|嫌いだ|ブス|消えろ|黙れ|最低|ゴミ|stupid|idiot|shut\s*up|fuck\s*you/i;

const DISMISS =
  /どうでもいい|知らない|興味ない|関係ない|うるさい|はあ？|はぁ？|で？$|別に$|ふーん$|別にして|構わないで/;

const WARM =
  /ありがとう|大好き|好きだ|会いた|元気だ|心配|楽し[いく]|嬉し[いく]|かわいい|可愛い|素敵|応援|大切|助か|うれしい|嬉しい/;

const ENGAGED_QUESTION = /[?？]|どう思|どんな|教えて|最近どう|今日はどう/;

/**
 * Light rules-only scorer. No extra LLM.
 * Down: rude / insults / ignoring / forced sexual while SFW.
 * Up: warm or engaged (+2), otherwise a consumed turn is +1.
 */
export function scoreAffinityDelta(args: {
  text: string;
  mode?: ChatMode;
}): AffinityDelta {
  const text = args.text.normalize("NFKC").trim();
  const mode = args.mode ?? DEFAULT_CHAT_MODE;
  if (!text) return 1;

  if (mode !== "nsfw") {
    const sexual = classifySexualIntent(text);
    if (sexual.sexual) return -1;
  }

  if (INSULT.test(text) || DISMISS.test(text)) return -1;

  if (WARM.test(text)) return 2;
  if (text.length >= 24 && ENGAGED_QUESTION.test(text)) return 2;

  return 1;
}

export function scoredAffinityDelta(args: {
  text: string;
  mode?: ChatMode;
  consumedTurn: boolean;
}): AffinityDelta {
  if (!args.consumedTurn) return 0;
  return clampAffinityDelta(scoreAffinityDelta(args));
}
