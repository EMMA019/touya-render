/** One-shot: split shared/characters.json into shared/characters/{id}.json */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(join(root, "shared/characters.json"), "utf8"));

const extras = {
  hiyori: {
    order: 10,
    portrait: {
      hair: "long",
      halloween: "hat",
      choker: true,
      dress: "#d48a88",
      skirt: "#8a3a44",
      sleeve: "#e0b0a8",
      collar: "#f0d0c8",
      skyBot: "#1a0c10",
    },
    demoReplies: [
      "うん、その感じ、わかる。カフェの窓、雨だね。温かいの、一緒に置いとく。",
      "話してくれてありがとう。甘えていいよ。ここにいて。",
      "そっか。無理にまとめなくていい。ひより、隣にいるから。",
    ],
  },
  rione: {
    order: 20,
    portrait: {
      hair: "long",
      halloween: "cape",
      choker: true,
      dress: "#f2e4dc",
      skirt: "#8a2438",
      sleeve: "#f6eee8",
      collar: "#c45a6a",
      skyBot: "#14080c",
    },
    demoReplies: [
      "は？　そんな顔しないでよ。…残ってても、邪魔じゃないけど。",
      "仕事の話なら、要点だけ。私もまだ帰らないし。",
      "本屋、行くなら先に歩きなさい。置いてかないから。",
    ],
  },
  shiraishi: {
    order: 30,
    portrait: {
      hair: "shoulder",
      halloween: "hat",
      choker: false,
      dress: "#1c2238",
      skirt: "#121428",
      sleeve: "#2a3050",
      collar: "#d0d8f8",
      skyBot: "#080810",
    },
    demoReplies: [
      "了解。屋上の風、少し冷たい。続きは、短くでいい。",
      "考えすぎ。今夜は仮説を置いて、休む。隣は静かにしておく。",
      "公園でも屋上でも同じ。用があるなら、先に言って。",
    ],
  },
  clara: {
    order: 40,
    portrait: {
      hair: "long",
      halloween: "mask",
      choker: false,
      dress: "#e0b0c4",
      skirt: "#8a5a70",
      sleeve: "#ecc4d0",
      collar: "#f6e4cc",
      skyBot: "#120810",
    },
    demoReplies: [
      "Oui… その気持ち、わかるわ。テラスの風、少し置いておきましょう。",
      "無理しなくていいのよ。言葉は、あとからで構わない。",
      "静かな夜ね。続きは、好きなところからでいいわ。",
    ],
  },
};

const outDir = join(root, "shared/characters");
mkdirSync(outDir, { recursive: true });

for (const character of catalog.characters) {
  const extra = extras[character.id] ?? { order: 90 };
  const next = { ...character, ...extra };
  writeFileSync(join(outDir, `${character.id}.json`), `${JSON.stringify(next, null, 2)}\n`);
  console.log("wrote", character.id);
}
