import { MEMORY_WRITE_POLICY } from "./product-behavior";
import { classifySexualIntent } from "./sexual-intent";

export { MEMORY_WRITE_POLICY };

export type MemoryKind = "profile" | "preference" | "relationship" | "agreement";

export type MemoryFact = {
  kind: MemoryKind;
  text: string;
};

/**
 * Selective memory write policy (rules-only, no memory LLM).
 * See MEMORY_WRITE_POLICY. Persist only high-signal facts:
 * explicit 覚えて / a lasting preference / a name / a lasting relationship beat.
 * Never store chit-chat, trivia, or sexual / body-measure content.
 */
const TRIVIA =
  /首都|人口|円周率|株価|天気予報|ニュース|大統領|首相|円安|ドル円|今日の試合/;

const BODY_MEASURE =
  /バスト|ウェスト|ウエスト|ヒップ|スリーサイズ|BWH|カップ数|(?:[BWH]\s*\d{2})|\d{2}\s*[-／/]\s*\d{2}/i;

const SAVE_CUE =
  /(?:覚えて(?:て|おいて)?|忘れないで|メモして)[、。:\s　]*(.+)$/;

const NAME =
  /(?:私|僕|俺|自分)(?:の名前)?(?:は|って)([一-龯ぁ-んァ-ンA-Za-z]{2,12})/;

const CALL_ME = /([一-龯ぁ-んァ-ンA-Za-z]{2,12})って呼んで/;

const PREFERENCE = /(.{1,16}?)が(好き|嫌い|苦手)/;

const AGREEMENT = /(?:約束|これからは)[は：:\s　]*(.{1,30})/;

const RELATIONSHIP =
  /(?:彼女|彼氏|友達)(?:で(?:は|じゃ)ない|として)|これからも(?:友達|一緒)/;

const EPHEMERAL = /今日|今|さっき|この前|とりあえず/;

const CHIT_CHAT =
  /^(?:こんにち|こんばん|おはよう|お疲れ|ひさしぶり|うん|そうだね|なるほど|ありがとう|よろしく)/;

export function extractMemoryFacts(userText: string): MemoryFact[] {
  const normalized = userText.normalize("NFKC").trim();
  if (!normalized) return [];
  if (classifySexualIntent(normalized).sexual) return [];
  if (TRIVIA.test(normalized) || BODY_MEASURE.test(normalized)) return [];
  if (CHIT_CHAT.test(normalized) && !hasSaveCue(normalized)) return [];

  const found: MemoryFact[] = [];
  const explicit = hasSaveCue(normalized);

  const save = normalized.match(SAVE_CUE);
  if (save?.[1]) {
    const text = clean(save[1]);
    if (text && !BODY_MEASURE.test(text) && !TRIVIA.test(text)) {
      found.push({ kind: guessKind(text), text });
    }
  }

  const callMe = normalized.match(CALL_ME);
  const name = normalized.match(NAME);
  const rawName = callMe?.[1] ?? name?.[1];
  if (rawName && looksLikeName(rawName)) {
    found.push({ kind: "profile", text: `呼び名は${clean(rawName)}` });
  }

  const pref = normalized.match(PREFERENCE);
  if (pref?.[1] && pref[1].length <= 16 && !TRIVIA.test(pref[1])) {
    const lasting = explicit || !EPHEMERAL.test(normalized);
    if (lasting && !/^(それ|これ|あれ)$/.test(pref[1])) {
      found.push({ kind: "preference", text: clean(`${pref[1]}が${pref[2]}`) });
    }
  }

  const agree = normalized.match(AGREEMENT);
  if (agree?.[1] && (explicit || /約束|これからは/.test(normalized))) {
    found.push({ kind: "agreement", text: clean(agree[1]) });
  }

  if (RELATIONSHIP.test(normalized) && (explicit || /約束|これから/.test(normalized))) {
    found.push({ kind: "relationship", text: clean(normalized).slice(0, 40) });
  }

  return dedupe(found).slice(0, 2);
}

function hasSaveCue(text: string): boolean {
  return /覚えて|忘れないで|メモして/.test(text);
}

function looksLikeName(value: string): boolean {
  if (value.length < 2 || value.length > 8) return false;
  if (/^(今|今日|ちょっと|そう|まだ|もう|すぐ)$/.test(value)) return false;
  if (/疲|眠|困|忙|痛|嫌|学生|社員|人間|大人|子供/.test(value)) return false;
  if (/[るすん]$/.test(value)) return false;
  return true;
}

function guessKind(text: string): MemoryKind {
  if (/好き|嫌い|苦手/.test(text)) return "preference";
  if (/約束|これから/.test(text)) return "agreement";
  if (/彼女|彼氏|友達/.test(text)) return "relationship";
  return "profile";
}

function clean(text: string): string {
  return text.replace(/[。．.！!？?\s]+$/g, "").trim().slice(0, 60);
}

function dedupe(facts: MemoryFact[]): MemoryFact[] {
  const seen = new Set<string>();
  const out: MemoryFact[] = [];
  for (const fact of facts) {
    if (!fact.text || seen.has(fact.text)) continue;
    seen.add(fact.text);
    out.push(fact);
  }
  return out;
}
