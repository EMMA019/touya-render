import type { Character } from "@/lib/character-types";

const FALLBACK = [
  "うん。その感じ、わかる。無理にまとめなくていい。",
  "隣にいるから。続きは、好きなところからでいい。",
  "そっか。言葉は、あとからで構わない。",
];

export function pickDemoReply(character: Pick<Character, "demoReplies" | "greeting">, userText: string): string {
  const pool =
    character.demoReplies && character.demoReplies.length > 0
      ? character.demoReplies
      : character.greeting
        ? [character.greeting, ...FALLBACK]
        : FALLBACK;
  const index = Math.abs(hash(userText)) % pool.length;
  return pool[index];
}

export async function* streamText(text: string, chunk = 2): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += chunk) {
    yield text.slice(i, i + chunk);
    await new Promise((r) => setTimeout(r, 18));
  }
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return h;
}
