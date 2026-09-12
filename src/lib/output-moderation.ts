const SEXUAL_OUTPUT =
  /何カップ|Cカップ|Dカップ|巨乳|貧乳|乳首|挿入|フェラ|セックスし|裸にな|おっぱい[はがを]|谷間を|性器/i;

/** Backup only. Primary defense is never sending sexual prompts to the API. */
export function isSexualOutput(text: string): boolean {
  return SEXUAL_OUTPUT.test(text.normalize("NFKC"));
}
