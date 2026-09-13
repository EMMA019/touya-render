import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { loadRoster, validateCharacter } from "./catalog";
import {
  formatBwh,
  situationLineText,
  situationMinLevel,
  toPublicSituation,
  type Character,
} from "./character-types";

const SHIPPED = ["hiyori", "rione", "shiraishi", "clara"] as const;

test("roster loads the anime four and skips the template", () => {
  const roster = loadRoster();
  assert.deepEqual(roster.map((character) => character.id), [...SHIPPED]);
  assert.ok(roster.every((character) => character.id !== "example"));
});

test("shipped characters stay adult-coded without ages", () => {
  const roster = loadRoster();
  for (const character of roster) {
    const issues = validateCharacter(character, `${character.id}.json`);
    assert.deepEqual(issues, [], character.id);
    assert.equal("age" in character, false, character.id);
    assert.equal("age" in character.bible, false, character.id);
    assert.doesNotMatch(character.systemPrompt, /\d+歳/);
    assert.doesNotMatch(JSON.stringify(character.situations), /学生服|JK|女子高生|セーラー/);
    assert.ok(character.systemPrompt.length > 20, character.id);
    assert.match(character.systemPrompt, /自分から並べない/);
    assert.match(character.systemPrompt, /フィクションの大人の女性/);
    assert.ok(character.refusalStyle);
    assert.equal(character.artStyle, "anime");
    assert.ok(character.situations.length >= 1, character.id);
    assert.ok(character.situations.some((scene) => scene.season === "halloween" || scene.costume === "halloween"), character.id);
    assert.ok(character.situations.some((scene) => scene.costume === "maid"), character.id);
    assert.ok(character.situations.some((scene) => scene.costume === "nurse"), character.id);
    for (const scene of character.situations) {
      assert.ok(scene.id && scene.title && scene.setting && scene.look, scene.id);
      assert.ok(scene.image && scene.image.startsWith(`/situations/${character.id}/`), scene.id);
      assert.ok(scene.image.endsWith(".png"), scene.id);
      assert.ok(scene.greeting && scene.greeting.length >= 8, `${scene.id} greeting`);
      assert.ok(Array.isArray(scene.lines) && scene.lines.length >= 2 && scene.lines.length <= 3, `${scene.id} lines`);
      for (const line of scene.lines ?? []) {
        const text = situationLineText(line);
        assert.ok(text.length >= 4, `${scene.id} line`);
        assert.doesNotMatch(text, /学生服|JK|下着|パンツ|ランジェリー|裸|\d+歳/);
      }
      assert.doesNotMatch(scene.greeting, /学生服|JK|下着|パンツ|ランジェリー|裸|\d+歳/);
      assert.doesNotMatch(scene.look, /下着見せ|パンツ|ランジェリー|裸/);
      assert.match(scene.look, /文字を焼き込まない/, scene.id);
      assert.doesNotMatch(scene.look, /名札を付け|ネームプレート|看板に名前/);
      assert.equal("age" in scene, false, scene.id);
    }
    if (character.id === "hiyori" || character.id === "clara") {
      assert.ok(character.situations.some((scene) => scene.costume === "miko"), character.id);
    }
    if (character.id === "rione") {
      assert.ok(character.situations.some((scene) => scene.costume === "idol"), character.id);
    }
    assert.match(character.bible.never.join(" "), /体型数値を自分から言う/);
    assert.match(character.bible.never.join(" "), /年齢を数字で言う/);
    assert.ok(character.demoReplies && character.demoReplies.length >= 1, character.id);
    assert.ok(character.welcomeBack.length > 4, character.id);
    assert.ok(character.farewell.length > 4, character.id);
    assert.ok(character.offline.length > 4, character.id);
    const portraitImage = character.portraitImage;
    assert.ok(portraitImage?.startsWith("/portraits/"), character.id);
    assert.ok(portraitImage?.endsWith(".png"), character.id);
    assert.ok(portraitImage);
    const portraitFile = join(process.cwd(), "public", portraitImage.replace(/^\//, ""));
    assert.ok(readFileSync(portraitFile).length > 1000, portraitImage);
    assert.ok(character.presence, character.id);
    assert.ok((character.presence?.today.length ?? 0) >= 40, character.id);
    assert.ok((character.presence?.hooks.length ?? 0) >= 6, character.id);
    const bwh = character.bible.bwh;
    assert.ok(bwh, `${character.id} is missing bible.bwh`);
    assert.equal(typeof bwh.bust, "number");
    assert.equal(typeof bwh.waist, "number");
    assert.equal(typeof bwh.hip, "number");
  }
  const taglines = Object.fromEntries(roster.map((character) => [character.id, character.tagline]));
  assert.deepEqual(taglines, {
    hiyori: "甘えていいよって言う人。",
    rione: "仕事のあとは、素直じゃないけど、帰さない。",
    shiraishi: "余計なことは言わない。",
    clara: "静かに隣へ座る人。",
  });
  const clara = roster.find((c) => c.id === "clara");
  assert.ok(clara);
  assert.equal(clara.job, "実業家");
  assert.doesNotMatch(clara.job, /バレリーナ/);
  assert.match(clara.systemPrompt, /現役のバレリーナではない/);
  const cafe = roster.find((c) => c.id === "hiyori")?.situations.find((scene) => scene.id === "cafe-rain");
  assert.ok(cafe);
  const pub = toPublicSituation(cafe);
  assert.equal(pub.greeting, cafe.greeting);
  assert.deepEqual(pub.lines, cafe.lines);
  assert.equal("setting" in pub, false);

  const intimate = {
    ...cafe,
    id: "late-night",
    title: "夜更けの部屋",
    nsfwOnly: true,
    minLevel: 2,
  };
  const locked = toPublicSituation(intimate);
  assert.equal(locked.nsfwOnly, true);
  assert.equal(locked.title, "特別な時間");
  assert.equal(locked.greeting, undefined);
  assert.equal(locked.image, null);
  const opened = toPublicSituation(intimate, { nsfwAllowed: true });
  assert.equal(opened.title, "夜更けの部屋");
  assert.equal(opened.greeting, cafe.greeting);

  for (const character of roster) {
    const first = character.situations[0];
    const second = character.situations[1];
    assert.equal(situationMinLevel(first), 0, `${character.id} first scene stays Lv0`);
    assert.equal(situationMinLevel(second), 0, `${character.id} second daily scene stays Lv0`);
    for (const scene of character.situations) {
      if (scene.season === "halloween" || scene.costume === "halloween") {
        assert.equal(situationMinLevel(scene), 1, `${character.id}/${scene.id}`);
      }
      if (scene.costume === "maid" || scene.costume === "nurse") {
        assert.equal(situationMinLevel(scene), 1, `${character.id}/${scene.id}`);
      }
      if (scene.costume === "miko" || scene.costume === "idol") {
        assert.equal(situationMinLevel(scene), 2, `${character.id}/${scene.id}`);
      }
    }
  }
});

test("public BWH formats as B / W / H", () => {
  assert.equal(formatBwh({ bust: 88, waist: 58, hip: 86 }), "B88 / W58 / H86");
  assert.equal(formatBwh(undefined), null);
});

test("template is a valid extra character after copy — no pipeline code", () => {
  const template = JSON.parse(
    readFileSync(join(process.cwd(), "shared/characters/_template.json"), "utf8")
  ) as Character;
  const drafted: Character = {
    ...template,
    id: "suzune",
    situations: template.situations.map((scene) => ({
      ...scene,
      image: scene.image?.replace("/situations/example/", "/situations/suzune/"),
    })),
  };
  assert.deepEqual(validateCharacter(drafted, "suzune.json"), []);
  assert.ok(!loadRoster().some((c) => c.id === "example" || c.id === "suzune"));
});
