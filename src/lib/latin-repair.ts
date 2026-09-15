/**
 * Gemma sometimes emits a Latin token in otherwise Japanese speech
 * (`liability` for ほうじ茶, `ひyorum`). Detect, one-shot regen, then scrub.
 * Keep this a post-filter — do not pile English bans into the system prompt.
 */

const LATIN_WORD = /[A-Za-z][A-Za-z'-]{2,}/g;
const MIXED_JP_LATIN =
  /[\u3040-\u30ff\u4e00-\u9fff]+[A-Za-z]{2,}|[A-Za-z]{2,}[\u3040-\u30ff\u4e00-\u9fff]+/g;
const LAUGH_W = /^w+$/i;

export const LATIN_REGEN_INSTRUCTION =
  "いまの返答に英単語やラテン文字が混ざった。同じ内容を、日本語の話し言葉だけでもう一度書く。英単語は入れない。";

const CLARA_ALLOW = ["Oui", "Bonsoir", "Merci", "Clara", "Berger"];

export function latinAllowFor(character: { id: string }): string[] {
  return character.id === "clara" ? [...CLARA_ALLOW] : [];
}

function allowSet(allow: string[] = []): Set<string> {
  return new Set(allow.map((word) => word.toLowerCase()));
}

function latinWords(text: string, allow: string[] = []): string[] {
  const ok = allowSet(allow);
  const found: string[] = [];
  for (const match of text.match(LATIN_WORD) ?? []) {
    if (LAUGH_W.test(match)) continue;
    if (ok.has(match.toLowerCase())) continue;
    found.push(match);
  }
  return found;
}

function mixedTokens(text: string): string[] {
  return text.match(MIXED_JP_LATIN) ?? [];
}

export function latinSlips(text: string, allow: string[] = []): string[] {
  const mixed = mixedTokens(text);
  const rest = text.replace(MIXED_JP_LATIN, " ");
  return [...new Set([...mixed, ...latinWords(rest, allow)])];
}

export function hasLatinSlip(text: string, allow: string[] = []): boolean {
  return latinSlips(text, allow).length > 0;
}

export function scrubLatin(text: string, allow: string[] = []): string {
  const ok = allowSet(allow);
  let next = text.replace(MIXED_JP_LATIN, (token) => token.replace(/[A-Za-z]+/g, ""));
  next = next.replace(LATIN_WORD, (word) => {
    if (LAUGH_W.test(word) || ok.has(word.toLowerCase())) return word;
    return "";
  });
  next = next
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[、,]\s*[、,]/g, "、")
    .replace(/\s+([。！？])/g, "$1")
    .replace(/[。．]\s*[。．]/g, "。")
    .trim();
  return next;
}

export async function repairAssistantLatin(args: {
  text: string;
  allow?: string[];
  regenerate?: () => Promise<string>;
}): Promise<{ text: string; repaired: boolean; regenerated: boolean }> {
  const allow = args.allow ?? [];
  if (!hasLatinSlip(args.text, allow)) {
    return { text: args.text, repaired: false, regenerated: false };
  }
  if (args.regenerate) {
    try {
      const next = (await args.regenerate()).trim();
      if (next) {
        const cleaned = hasLatinSlip(next, allow) ? scrubLatin(next, allow) : next;
        if (cleaned) {
          return { text: cleaned, repaired: true, regenerated: true };
        }
      }
    } catch {
      // scrub below
    }
  }
  const scrubbed = scrubLatin(args.text, allow);
  return { text: scrubbed || args.text, repaired: true, regenerated: false };
}
