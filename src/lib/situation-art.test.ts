import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { loadRoster } from "./catalog";

const ART_DIR = join(process.cwd(), "public/situations");

const TEXT_MARKUP = /<(?:text|tspan|textPath|title|desc)\b/i;
const BAKED_NAMES =
  /ひより|凛音|白石|クララ|あやか|七海|セナ|エレナ|みお|ゆい|りな|ソフィア|燈夜|とうや|Hiyori|Rione|Shiraishi|Clara|Ayaka|Nanami|Sena|Elena|Mio|Yui|Rina|Sophia|Touya|Berger|Wolf|Lane/i;
const BAKED_WORDS =
  /MAID|NURSE|IDOL|HALLOWEEN|CAFE|メイド|ナース|巫女|アイドル|カフェ|オフィス/;

test("situation art is character-only: no baked names or clothing/sign text", () => {
  const files: string[] = [];
  for (const character of readdirSync(ART_DIR)) {
    const dir = join(ART_DIR, character);
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".svg")) files.push(join(dir, name));
    }
  }
  assert.ok(files.length >= 20, "expected generated portraits");

  for (const file of files) {
    const svg = readFileSync(file, "utf8");
    assert.doesNotMatch(svg, TEXT_MARKUP, file);
    assert.doesNotMatch(svg, BAKED_NAMES, file);
    assert.doesNotMatch(svg, BAKED_WORDS, file);
    assert.doesNotMatch(svg, /font-family|font-size/, file);
  }

  for (const character of loadRoster()) {
    for (const scene of character.situations) {
      assert.match(scene.look, /文字を焼き込まない/, scene.id);
      const rel = scene.image?.replace(/^\//, "");
      assert.ok(rel, scene.id);
      assert.ok(rel.endsWith(".png"), scene.image ?? scene.id);
      const abs = join(process.cwd(), "public", rel);
      assert.ok(readFileSync(abs).length > 1000, scene.image ?? scene.id);
      if (scene.video != null) {
        assert.equal(typeof scene.video, "string");
        assert.ok(scene.video.trim().length > 0, `${scene.id} video`);
      }
    }
  }
});
