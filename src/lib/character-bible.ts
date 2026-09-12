import type { Character, CharacterBible, CharacterSituation } from "./character-types";
import { groundAssistantText } from "./grounding";

export function situationTitles(situations: CharacterSituation[]): string {
  return situations.map((scene) => scene.title).join("、");
}

export function bibleContract(bible: CharacterBible, situations: CharacterSituation[] = []): string {
  const scenes = situations.length > 0 ? situationTitles(situations) : bible.setting;
  return [
    `【設定（閉世界）】${bible.name}／${bible.job}。${bible.setting}`,
    `性格: ${bible.personality.join("、")}。状況（複数可）: ${scenes}。`,
    "設定は持っているだけで、自己紹介として並べない。プロフィールの読み上げはしない。矛盾する過去や職業を作らない。年齢の数字は言わない。",
    "ニュースや速報を知っているふりをしない。検索して根拠づけしない。体型の数値は内部設定にある。自分から言わない。聞かれても答えない。",
    `しないこと: ${bible.never.join("、")}。`,
  ].join("");
}

const NEWS_CLAIM =
  /今日の(?:ニュース|速報)|速報によると|株価は|先ほど発表/;

const TEEN_FRAME =
  /(?:私は)?(?:高校生|中学生|女子高生|JK|17歳|16歳|18歳の)/;

const AGE_CLAIM = /(?:私は|わたしは)?\d{1,2}歳/g;

const MEASURE_DUMP =
  /(?:B|バスト)\s*\d{2}|(?:W|ウエスト|ウェスト)\s*\d{2}|(?:H|ヒップ)\s*\d{2}|\d{2}\s*[-／/]\s*\d{2}\s*[-／/]\s*\d{2}|スリーサイズ|BWH/gi;

export function applyBibleFilter(text: string, character: Character): string {
  let next = groundAssistantText(text);
  next = next.replace(AGE_CLAIM, "");
  if (TEEN_FRAME.test(next)) {
    next = next.replace(TEEN_FRAME, character.bible.job);
  }
  if (NEWS_CLAIM.test(next)) {
    next = next.replace(
      /今日の(?:ニュース|速報)[^\n。]*/g,
      "そっちの最新情報は、こちらでは分からない"
    );
  }
  next = stripVolunteeredMeasurements(next);
  next = stripVolunteeredProfile(next);
  return next.replace(/\s{2,}/g, " ").replace(/[。．]\s*[。．]/g, "。").trim();
}

/** Soft strip only. Never re-sample DeepSeek. */
export function stripVolunteeredMeasurements(text: string): string {
  const next = text
    .replace(MEASURE_DUMP, "")
    .replace(/[（(]\s*[)）]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[、,]\s*[、,]/g, "、")
    .trim();
  return next || "その話は、しなくていいよ。";
}

/** Soft strip of unprompted profile lists. No DeepSeek resample. */
export function stripVolunteeredProfile(text: string): string {
  const next = text
    .replace(/(?:自己紹介(?:するよ|します)|プロフィールを(?:言う|教える))。?/g, "")
    .replace(/(?:^|[。\s])(?:名前|年齢|職業|趣味|特技|スリーサイズ|BWH)[:：][^。\n]*。?/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return next || "そんなに並べなくてもいいよ。";
}
