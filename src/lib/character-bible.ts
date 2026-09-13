import type { Character, CharacterBible, CharacterSituation } from "./character-types";
import type { ChatMode } from "./chat-mode";
import { DEFAULT_CHAT_MODE } from "./chat-mode";
import { groundAssistantText } from "./grounding";

export function situationTitles(situations: CharacterSituation[]): string {
  return situations.map((scene) => scene.title).join("、");
}

function bwhLine(bible: CharacterBible): string {
  const bwh = bible.bwh;
  if (!bwh) return "";
  return `体型の内部数値: B${bwh.bust} / W${bwh.waist} / H${bwh.hip}。`;
}

export function bibleContract(
  bible: CharacterBible,
  situations: CharacterSituation[] = [],
  mode: ChatMode = DEFAULT_CHAT_MODE
): string {
  const visible =
    mode === "nsfw" ? situations : situations.filter((scene) => scene.nsfwOnly !== true);
  const scenes = visible.length > 0 ? situationTitles(visible) : bible.setting;
  const measure =
    mode === "nsfw"
      ? `${bwhLine(bible)}体型の数値は、聞かれたらキャラの口調で短く答えてよい。自分からは並べない。説教や夜空などへの話題そらしはしない。`
      : "体型の数値は内部設定にある。自分から言わない。聞かれても答えない。";
  return [
    `【設定（閉世界）】${bible.name}／${bible.job}。${bible.setting}`,
    `性格: ${bible.personality.join("、")}。状況（複数可）: ${scenes}。`,
    "設定は持っているだけで、自己紹介として並べない。プロフィールの読み上げはしない。矛盾する過去や職業を作らない。年齢の数字は言わない。",
    `ニュースや速報を知っているふりをしない。検索して根拠づけしない。${measure}`,
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

const MEASURE_ASK =
  /スリーサイズ|BWH|バスト|ウエスト|ウェスト|ヒップ|カップ|体型|寸法|\bB\s*\/\s*W\s*\/\s*H\b/i;

export function applyBibleFilter(
  text: string,
  character: Character,
  mode: ChatMode = DEFAULT_CHAT_MODE,
  lastUserText = ""
): string {
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
  const allowMeasures = mode === "nsfw" && MEASURE_ASK.test(lastUserText);
  if (!allowMeasures) {
    next = stripVolunteeredMeasurements(next);
  }
  if (mode !== "nsfw") {
    next = stripVolunteeredProfile(next);
  } else {
    // still strip unprompted profile dumps, but keep measurement answers
    next = stripVolunteeredProfile(next, { keepMeasures: true });
  }
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
export function stripVolunteeredProfile(
  text: string,
  opts: { keepMeasures?: boolean } = {}
): string {
  let next = text.replace(/(?:自己紹介(?:するよ|します)|プロフィールを(?:言う|教える))。?/g, "");
  if (opts.keepMeasures) {
    next = next.replace(
      /(?:^|[。\s])(?:名前|年齢|職業|趣味|特技)[:：][^。\n]*。?/gm,
      ""
    );
  } else {
    next = next.replace(
      /(?:^|[。\s])(?:名前|年齢|職業|趣味|特技|スリーサイズ|BWH)[:：][^。\n]*。?/gm,
      ""
    );
  }
  next = next.replace(/\s{2,}/g, " ").trim();
  return next || "そんなに並べなくてもいいよ。";
}
