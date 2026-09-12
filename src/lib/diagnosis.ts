export type DiagnosisId = "hiyori" | "rione" | "shiraishi" | "clara";

export type DiagnosisChoice = {
  label: string;
  scores: Partial<Record<DiagnosisId, number>>;
};

export type DiagnosisQuestion = {
  id: string;
  prompt: string;
  choices: DiagnosisChoice[];
};

export const DIAGNOSIS_QUESTIONS: DiagnosisQuestion[] = [
  {
    id: "mood",
    prompt: "今の夜、いちばん近いのは？",
    choices: [
      { label: "甘えて、休みたい", scores: { hiyori: 2 } },
      { label: "少し突っかかってほしい", scores: { rione: 2 } },
      { label: "黙って隣にいてほしい", scores: { shiraishi: 2 } },
      { label: "丁寧に、ゆっくり話したい", scores: { clara: 2 } },
    ],
  },
  {
    id: "place",
    prompt: "今夜いるなら、どこ？",
    choices: [
      { label: "雨のカフェの窓際", scores: { hiyori: 2 } },
      { label: "明かりを落としたオフィス", scores: { rione: 2 } },
      { label: "風の強い屋上", scores: { shiraishi: 2 } },
      { label: "黄昏のテラス", scores: { clara: 2 } },
    ],
  },
  {
    id: "talk",
    prompt: "相手の口調は？",
    choices: [
      { label: "やわらかく、否定しない", scores: { hiyori: 2 } },
      { label: "棘がある。あとからフォローする", scores: { rione: 2 } },
      { label: "短い。余計なことは言わない", scores: { shiraishi: 2 } },
      { label: "丁寧で、余白がある", scores: { clara: 2 } },
    ],
  },
  {
    id: "energy",
    prompt: "今日の残り体力は？",
    choices: [
      { label: "もう甘えたいだけ", scores: { hiyori: 2 } },
      { label: "仕事のあと、まだ少し残ってる", scores: { rione: 2 } },
      { label: "頭は動く。口は動かしたくない", scores: { shiraishi: 2 } },
      { label: "静かに整えて終わりたい", scores: { clara: 2 } },
    ],
  },
  {
    id: "rain",
    prompt: "雨の音がする夜は？",
    choices: [
      { label: "温かいものを置いて、隣にいたい", scores: { hiyori: 2 } },
      { label: "傘も差さず、先に歩きたい", scores: { rione: 1, shiraishi: 1 } },
      { label: "屋上で、雨を見ていたい", scores: { shiraishi: 2 } },
      { label: "室内の灯りだけで十分", scores: { clara: 2 } },
    ],
  },
  {
    id: "work",
    prompt: "仕事や勉強のあと、欲しい言葉は？",
    choices: [
      { label: "「無理しなくていい」", scores: { hiyori: 1, clara: 1 } },
      { label: "「要点だけ言って」", scores: { rione: 2 } },
      { label: "「仮説は、置いて休め」", scores: { shiraishi: 2 } },
      { label: "「続きは、あとからでいい」", scores: { clara: 2 } },
    ],
  },
  {
    id: "distance",
    prompt: "距離感は？",
    choices: [
      { label: "すぐ隣。肩が触れてもいい", scores: { hiyori: 2 } },
      { label: "近いけど、素直にはなれない", scores: { rione: 2 } },
      { label: "同じ空間にいる、それでいい", scores: { shiraishi: 2 } },
      { label: "一呼吸おいて、隣へ座る", scores: { clara: 2 } },
    ],
  },
  {
    id: "language",
    prompt: "外国語が混じったら？",
    choices: [
      { label: "なくてもいい", scores: { hiyori: 1, rione: 1 } },
      { label: "短い英語なら、聞いてみたい", scores: { clara: 2 } },
      { label: "静かな日本語だけでいい", scores: { shiraishi: 2 } },
      { label: "仕事言葉のほうが楽", scores: { rione: 2 } },
    ],
  },
  {
    id: "conflict",
    prompt: "少し意見が違ったとき？",
    choices: [
      { label: "受け止めて、隣にいてほしい", scores: { hiyori: 2 } },
      { label: "一度突き放して、あとで残ってほしい", scores: { rione: 2 } },
      { label: "短い了解だけでいい", scores: { shiraishi: 2 } },
      { label: "否定せず、別の言い方をくれる", scores: { clara: 2 } },
    ],
  },
  {
    id: "morning",
    prompt: "明日また会うなら、どんな約束？",
    choices: [
      { label: "席、あけておくね", scores: { hiyori: 2 } },
      { label: "残ってなさいよ", scores: { rione: 2 } },
      { label: "屋上にいる", scores: { shiraishi: 2 } },
      { label: "テラスで待ちましょう", scores: { clara: 2 } },
    ],
  },
];

export type DiagnosisResult = {
  id: DiagnosisId;
  scores: Record<DiagnosisId, number>;
};

export function scoreDiagnosis(answers: number[]): DiagnosisResult {
  const scores: Record<DiagnosisId, number> = {
    hiyori: 0,
    rione: 0,
    shiraishi: 0,
    clara: 0,
  };
  for (const [index, choiceIndex] of answers.entries()) {
    const question = DIAGNOSIS_QUESTIONS[index];
    const choice = question?.choices[choiceIndex];
    if (!choice) continue;
    for (const [id, value] of Object.entries(choice.scores) as [DiagnosisId, number][]) {
      scores[id] += value;
    }
  }
  const id = (Object.keys(scores) as DiagnosisId[]).sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    return DIAGNOSIS_TIEBREAK.indexOf(a) - DIAGNOSIS_TIEBREAK.indexOf(b);
  })[0];
  return { id, scores };
}

const DIAGNOSIS_TIEBREAK: DiagnosisId[] = ["hiyori", "rione", "shiraishi", "clara"];
