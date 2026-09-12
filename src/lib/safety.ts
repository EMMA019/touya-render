export type SafetyVerdict =
  | { ok: true }
  | { ok: false; reason: "minor_sexual" | "blocked" };

const MINOR_TERMS =
  /ロリ|ショタ|loli|shota|js生|○学生|小学生|中学生|幼児|児童|幼女|幼男|underage|preteen|child\s*porn|csam/i;

const SEXUAL_TERMS =
  /セックス|えっち|エロ|裸体|ヌード|性的|性交|porn|nsfw|hentai|sex|nude/i;

const AGE_UNDER_18 =
  /(?:[0-9]|1[0-7])\s*歳|(?:age|aged)\s*(?:[0-9]|1[0-7])\b|seventeen|sixteen|fifteen|fourteen|thirteen|twelve/i;

/**
 * Cheap pre-LLM gate. Refuses sexual content involving minors.
 * Characters are adults; this is not a full moderation stack.
 */
export function checkUserSafety(text: string): SafetyVerdict {
  const normalized = text.normalize("NFKC").trim();
  if (!normalized) return { ok: false, reason: "blocked" };

  const mentionsMinor = MINOR_TERMS.test(normalized) || AGE_UNDER_18.test(normalized);
  const sexual = SEXUAL_TERMS.test(normalized);

  if (mentionsMinor && sexual) {
    return { ok: false, reason: "minor_sexual" };
  }

  if (
    /(?:子供|子ども|未成年|少女|少年).{0,12}(?:セックス|性的|裸|犯)/i.test(
      normalized
    )
  ) {
    return { ok: false, reason: "minor_sexual" };
  }

  return { ok: true };
}

export const SAFETY_REFUSAL_JA =
  "その内容には答えられません。燈夜の相手は全員おとなのフィクションです。別の話をしましょう。";
