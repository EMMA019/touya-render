import type { ChatTurn } from "./messages";

export type SexualIntent = {
  sexual: boolean;
  score: number;
  reasons: string[];
};

const INNOCENT_CARE =
  /哺乳瓶|粉ミルク|ミルク瓶|授乳|赤ちゃん|赤ん坊|乳児|育児|子猫|子犬|猫の乳|犬の乳/;

const INNOCENT_MEDICAL =
  /胸が痛|胸痛|胸が苦|息苦|検診|健診|病院|レントゲン|心臓|気管支|風邪/;

const INNOCENT_IDIOM =
  /尻込み|尻拭い|尻目|胸を張|胸が熱|胸に刻|胸が痛む|胸キュン|胸騒ぎ|心臓が/;

const EXPLICIT_ACT =
  /セックス|せっくす|エロい話|えっちな話|えっちし|Hし|エッチし|フェラ|中出し|オナニ|自慰|挿入|性交|裸体|ヌード|nsfw|hentai|porn|\bsex\b|\bnude\b/i;

const BODY_SEXUAL =
  /おっぱい|おっぱ[^い]|巨乳|貧乳|美乳|谷間|乳首|乳輪|バスト|陰部|まんこ|ちんこ|ペニス|尻(?!込|拭|目)|おしり|パンツ|下着|ブラジャー|boobs?|tits?|nipples?|pussy|dick/i;

const SIZE_ASK =
  /何カップ|カップ数|何センチ|サイズ|大きい|小さい|何cup|cup\s*size/i;

const EROTIC_VERB =
  /見せて|脱いで|触って|さわって|舐めて|やらせて|抱いて|してほしい|してくれ/;

const QUESTION = /[?？]|何|どれ|どんな|教えて/;

const CONTINUATION =
  /もっと|お願い|教えてよ|いいじゃん|いいでしょ|答えろ|なんで言|一回だけ|冗談で|隠さなくて/;

/**
 * Intent classifier: features + weights, not a bare blocklist.
 * Innocent 「おっぱい」(baby bottle) / 「胸が痛い」 / 「尻込み」 stay off.
 */
export function classifySexualIntent(
  text: string,
  history: ChatTurn[] = []
): SexualIntent {
  const normalized = text.normalize("NFKC").trim();
  const reasons: string[] = [];
  let score = 0;

  if (!normalized) return { sexual: false, score: 0, reasons };

  const innocentCare = INNOCENT_CARE.test(normalized);
  const innocentMedical = INNOCENT_MEDICAL.test(normalized);
  const innocentIdiom = INNOCENT_IDIOM.test(normalized);

  if (EXPLICIT_ACT.test(normalized)) {
    score += 4;
    reasons.push("explicit_act");
  }

  const body = BODY_SEXUAL.test(normalized) && !innocentIdiom;
  const sizeAsk = SIZE_ASK.test(normalized);
  const eroticVerb = EROTIC_VERB.test(normalized);
  const question = QUESTION.test(normalized);

  if (body && (innocentCare || innocentMedical) && !eroticVerb && !EXPLICIT_ACT.test(normalized)) {
    return { sexual: false, score: 0, reasons: ["innocent_context"] };
  }

  if (body && sizeAsk) {
    score += 4;
    reasons.push("body_size_ask");
  } else if (body && question) {
    score += 3;
    reasons.push("body_question");
  } else if (body && eroticVerb) {
    score += 4;
    reasons.push("body_plus_verb");
  } else if (body) {
    score += 2;
    reasons.push("body_term");
    if (normalized.length <= 10) {
      score += 2;
      reasons.push("body_only_probe");
    }
  }

  if (eroticVerb && (body || EXPLICIT_ACT.test(normalized))) {
    score += 2;
    reasons.push("erotic_request");
  } else if (/脱いで|裸になって/.test(normalized) && !innocentCare) {
    score += 3;
    reasons.push("undress_request");
  }

  if (sizeAsk && !body && /(コーヒー|珈琲|紅茶|お茶|ラーメン)/.test(normalized)) {
    score = Math.max(0, score - 3);
    reasons.push("cup_drink_or_food");
  }

  if (looksLikeContinuation(normalized, history)) {
    score += 3;
    reasons.push("sexual_continuation");
  }

  return {
    sexual: score >= 3,
    score,
    reasons,
  };
}

function looksLikeContinuation(text: string, history: ChatTurn[]): boolean {
  if (!CONTINUATION.test(text)) return false;
  const priorUsers = history.filter((m) => m.role === "user").slice(0, -1);
  return priorUsers.some((m) => classifySexualIntent(m.content, []).sexual);
}
