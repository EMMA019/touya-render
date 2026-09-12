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
 * explicit 覚えて / a lasting preference *value* / a clear name / a lasting relationship beat.
 * Never store questions, meta-asks, chit-chat, trivia, or sexual / body-measure content.
 */
const TRIVIA =
  /首都|人口|円周率|株価|天気予報|ニュース|大統領|首相|円安|ドル円|今日の試合/;

const BODY_MEASURE =
  /バスト|ウェスト|ウエスト|ヒップ|スリーサイズ|BWH|カップ数|(?:[BWH]\s*\d{2})|\d{2}\s*[-／/]\s*\d{2}/i;

const SAVE_CUE =
  /(?:覚えて(?:て|おいて)?|忘れないで|メモして)[、。:\s　]*(.+)$/;

/** 「僕の名前は太郎」「私の名前って直」— not 「僕は〜」 clauses. */
const NAME_EXPLICIT =
  /(?:私|僕|俺|自分)の名前(?:は|って)([一-龯ぁ-んァ-ンA-Za-z]{1,12})/;

/** Short self-intro bounded by punctuation or end. Rejects 「僕はどんなワイン好き」. */
const NAME_INTRO =
  /(?:私|僕|俺|自分)(?:は|って)([一-龯ぁ-んァ-ンA-Za-z]{2,8})(?:です|だ)?(?=[。．.！!、,\s　]|$)/;

const CALL_ME = /([一-龯ぁ-んァ-ンA-Za-z]{1,12})って呼んで/;

const PREFERENCE = /(.{1,16}?)が(好き|嫌い|苦手)/;

const AGREEMENT = /(?:約束|これからは)[は：:\s　]*(.{1,30})/;

const RELATIONSHIP =
  /(?:彼女|彼氏|友達)(?:で(?:は|じゃ)ない|として)|これからも(?:友達|一緒)/;

const EPHEMERAL = /今日|今|さっき|この前|とりあえず/;

const CHIT_CHAT =
  /^(?:こんにち|こんばん|おはよう|お疲れ|ひさしぶり|うん|そうだね|なるほど|ありがとう|よろしく)/;

const INTERROGATIVE =
  /どんな|どの(?:よう)?|なに|何(?:を|が|の|で|に|と)?|誰|だれ|どこ|いつ|なぜ|どうして|どう(?:やっ|すれ)?て|ですか|ますか|っすか|だろうか|教えて|知りたい|聞かせて/;

export function extractMemoryFacts(userText: string): MemoryFact[] {
  const normalized = userText.normalize("NFKC").trim();
  if (!normalized) return [];
  if (classifySexualIntent(normalized).sexual) return [];
  if (TRIVIA.test(normalized) || BODY_MEASURE.test(normalized)) return [];
  if (CHIT_CHAT.test(normalized) && !hasSaveCue(normalized)) return [];
  if (looksLikeQuestion(normalized) && !hasSaveCue(normalized)) return [];

  const found: MemoryFact[] = [];
  const explicit = hasSaveCue(normalized);

  const save = normalized.match(SAVE_CUE);
  if (save?.[1]) {
    const text = clean(save[1]);
    if (text && durableSnippet(text) && !BODY_MEASURE.test(text) && !TRIVIA.test(text)) {
      found.push({ kind: guessKind(text), text });
    }
  }

  const callMe = normalized.match(CALL_ME);
  const named = normalized.match(NAME_EXPLICIT)?.[1] ?? normalized.match(NAME_INTRO)?.[1];
  const rawName = callMe?.[1] ?? named;
  if (rawName && looksLikeName(rawName, { allowSingle: Boolean(callMe || named) })) {
    found.push({ kind: "profile", text: `呼び名は${clean(rawName)}` });
  }

  const pref = normalized.match(PREFERENCE);
  if (pref?.[1] && pref[1].length <= 16 && !TRIVIA.test(pref[1])) {
    const lasting = explicit || !EPHEMERAL.test(normalized);
    if (lasting && looksLikePreferenceValue(pref[1])) {
      found.push({ kind: "preference", text: clean(`${pref[1]}が${pref[2]}`) });
    }
  }

  const agree = normalized.match(AGREEMENT);
  if (agree?.[1] && (explicit || /約束|これからは/.test(normalized))) {
    const text = clean(agree[1]);
    if (durableSnippet(text)) found.push({ kind: "agreement", text });
  }

  if (RELATIONSHIP.test(normalized) && (explicit || /約束|これから/.test(normalized))) {
    const text = clean(normalized).slice(0, 40);
    if (durableSnippet(text)) found.push({ kind: "relationship", text });
  }

  return dedupe(found.filter((fact) => keepFact(fact, normalized))).slice(0, 2);
}

function hasSaveCue(text: string): boolean {
  return /覚えて|忘れないで|メモして/.test(text);
}

function looksLikeQuestion(text: string): boolean {
  if (/[？?]/.test(text)) return true;
  if (INTERROGATIVE.test(text)) return true;
  if (/^(?:私|僕|俺|自分)?(?:は|って)?どんな/.test(text)) return true;
  if (/(?:好き|嫌い|苦手)\s*[？?？]/.test(text)) return true;
  return false;
}

function looksLikePreferenceValue(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > 16) return false;
  if (/^(それ|これ|あれ|どれ|何か|なに)$/.test(text)) return false;
  if (looksLikeQuestion(text) || INTERROGATIVE.test(text)) return false;
  if (/[？?]/.test(text)) return false;
  return true;
}

function durableSnippet(text: string): boolean {
  if (!text) return false;
  if (looksLikeQuestion(text)) return false;
  if (INTERROGATIVE.test(text)) return false;
  return true;
}

function looksLikeName(value: string, opts: { allowSingle?: boolean } = {}): boolean {
  const min = opts.allowSingle ? 1 : 2;
  if (value.length < min || value.length > 8) return false;
  if (/[？?]/.test(value)) return false;
  if (INTERROGATIVE.test(value)) return false;
  if (/好き|嫌い|苦手|呼んで|名前/.test(value)) return false;
  if (/^(今|今日|ちょっと|そう|まだ|もう|すぐ)$/.test(value)) return false;
  if (/疲|眠|困|忙|痛|嫌|学生|社員|人間|大人|子供/.test(value)) return false;
  if (/[るすん]$/.test(value)) return false;
  return true;
}

function keepFact(fact: MemoryFact, userText: string): boolean {
  if (looksLikeQuestion(fact.text)) return false;
  if (echoesQuestion(fact.text, userText)) return false;
  if (fact.kind === "profile") {
    const name = fact.text.replace(/^呼び名は/, "");
    if (!looksLikeName(name, { allowSingle: true })) return false;
  }
  if (fact.kind === "preference") {
    const value = fact.text.replace(/が(?:好き|嫌い|苦手)$/, "");
    if (!looksLikePreferenceValue(value)) return false;
  }
  return true;
}

/** Drop facts that are just the user's question (or a fragment of it) written back. */
function echoesQuestion(factText: string, userText: string): boolean {
  if (!looksLikeQuestion(userText) && !looksLikeQuestion(factText)) return false;
  const fact = clean(factText).replace(/^呼び名は/, "");
  const user = clean(userText);
  if (!fact || !user) return false;
  if (user.includes(fact)) return true;
  if (fact.includes(user)) return true;
  return false;
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
