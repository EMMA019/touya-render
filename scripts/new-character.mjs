/** Copy the template character. Does not touch the chat pipeline. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ID = /^[a-z][a-z0-9-]{1,24}$/;

const id = (process.argv[2] ?? "").trim();
if (!ID.test(id)) {
  console.error("使い方: npm run new-character -- <id>");
  console.error("id は英小文字・数字・ハイフン（例: suzune）");
  process.exit(1);
}

const dest = join(root, "shared/characters", `${id}.json`);
const templatePath = join(root, "shared/characters/_template.json");
if (existsSync(dest)) {
  console.error(`すでにあります: ${dest}`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(templatePath, "utf8"));
raw.id = id;
raw.order = 90;
raw.artStyle = raw.artStyle || "anime";
if (typeof raw.portraitImage === "string") {
  raw.portraitImage = raw.portraitImage.replace("/portraits/example.png", `/portraits/${id}.png`);
}
for (const scene of raw.situations ?? []) {
  if (typeof scene.image === "string") {
    scene.image = scene.image.replace("/situations/example/", `/situations/${id}/`);
  }
}
writeFileSync(dest, `${JSON.stringify(raw, null, 2)}\n`);

const artDir = join(root, "public/situations", id);
mkdirSync(artDir, { recursive: true });

const presenceSrc = join(root, "shared/presence/example.json");
const presenceDest = join(root, "shared/presence", `${id}.json`);
if (existsSync(presenceSrc) && !existsSync(presenceDest)) {
  writeFileSync(presenceDest, readFileSync(presenceSrc, "utf8"));
}

const { writePortraits } = await import("./generate-situation-portraits.mjs");
writePortraits([raw]);

console.log(`作った: shared/characters/${id}.json`);
console.log(`画像: public/situations/${id}/`);
console.log(`今夜の台詞: shared/presence/${id}.json`);
console.log("");
console.log("次:");
console.log(`  1. shared/characters/${id}.json の名前・職業・口調・systemPrompt・bible を埋める`);
console.log("  2. 年齢の数字は置かない。look に「服や背景に文字を焼き込まない」を残す");
console.log("  3. 各 situation に greeting と lines（2〜3本）を書く。無い場合は character.greeting が使われる");
console.log("     lines は文字列（Lv0）か { text, minLevel }。costume の minLevel で親密度ゲート（0〜3）。最初の日常場面は Lv0 のまま");
console.log("  4. 本番画像があれば public/situations/" + id + "/ に上書き（キャラだけ。名札・服の文字・看板なし）");
console.log("  5. npm test && npm run dev で再起動");
console.log("");
console.log("チャットのコードは触らなくてよい。許可された1通につき DeepSeek は1回だけ。");
