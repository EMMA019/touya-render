import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { loadRoster } from "./catalog";
import {
  findBeat,
  findChapter,
  loadStoryScripts,
  readStoryScriptFile,
  resetStoryScriptCache,
  sentenceCount,
  storyDir,
  toPublicScript,
  toPublicScriptForChapter,
  validateStoryScript,
} from "./story-script";
import type { StoryScript } from "./story-types";

const SHIPPED = ["hiyori", "rione", "shiraishi", "clara"] as const;

function situationsOf(characterId: string) {
  return loadRoster().find((character) => character.id === characterId)?.situations;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("every shared/story JSON validates and loads; four heroines each have Ch0", () => {
  resetStoryScriptCache();
  const scripts = loadStoryScripts(situationsOf);
  assert.deepEqual([...scripts.keys()].sort(), [...SHIPPED].sort());
  for (const id of SHIPPED) {
    const script = scripts.get(id);
    assert.ok(script, id);
    const ch0 = findChapter(script, `${id}-ch0`);
    assert.ok(ch0, `${id} Ch0`);
    assert.equal(ch0.chapter, 0);
    const scene = situationsOf(id)?.find((row) => row.id === ch0.situationId);
    assert.ok(scene, `${id} backdrop ${ch0.situationId}`);
    assert.equal(scene.costume, undefined, `${id} Ch0 backdrop is a daily scene`);
    assert.equal(scene.season, undefined);
    // Ch0 shape: entry line → metVia choice → per-metVia lines → … → end with B1.
    const entry = findBeat(ch0, ch0.entry);
    assert.equal(entry?.kind, "line", `${id} entry is a line`);
    const metViaBeat = ch0.beats.find((beat) => beat.choices?.some((choice) => choice.metVia));
    assert.ok(metViaBeat, `${id} has a metVia choice`);
    assert.ok((metViaBeat.choices?.length ?? 0) >= 2);
    for (const choice of metViaBeat.choices ?? []) {
      assert.ok(choice.metVia && script.metViaLines[choice.metVia], `${id}/${choice.id} metViaLine`);
    }
    const ends = ch0.beats.filter((beat) => beat.kind === "end");
    assert.ok(ends.length >= 1, `${id} end`);
    for (const end of ends) {
      assert.ok(end.setFlags?.includes("B1"), `${id}/${end.id} sets B1`);
      assert.ok(end.hook && end.hook.length >= 6, `${id}/${end.id} hook`);
    }
    // Names are chosen in Ch0: some choice sets B2.
    assert.ok(ch0.beats.some((beat) => beat.choices?.some((choice) => choice.setFlags?.includes("B2"))), `${id} B2 choice`);
    // No school framing, no ages, nothing about uniforms in any text.
    const blob = JSON.stringify(script);
    assert.doesNotMatch(blob, /学生服|制服|JK|女子高生|セーラー|学校|教室|高校|部活|登下校|\d+歳/);
    assert.doesNotMatch(blob, /下着|パンツ|ランジェリー|裸/);
    // Ch0 keeps the 1-LLM rule: no `free` beat in the shipped meeting scripts.
    assert.equal(ch0.beats.filter((beat) => beat.kind === "free").length, 0, `${id} Ch0 is pure script`);
  }
});

test("the template validates too and exercises every chapter shape", () => {
  const files = readdirSync(storyDir()).filter((name) => name.startsWith("_") && name.endsWith(".json"));
  assert.ok(files.includes("_template.json"));
  const template = readStoryScriptFile("_template.json");
  assert.deepEqual(validateStoryScript(template, { file: "_template.json" }), []);
  assert.deepEqual(template.chapters.map((chapter) => chapter.chapter), [0, 1, 2, 3]);
  const ch2 = findChapter(template, "example-ch2");
  assert.ok(ch2?.beats.some((beat) => beat.kind === "retry"));
  assert.ok(ch2?.beats.some((beat) => beat.kind === "defer"));
  assert.ok(findChapter(template, "example-ch0")?.beats.some((beat) => beat.kind === "free"));
});

test("public script strips promptHint / metViaLines / reveals dictionary", () => {
  const template = readStoryScriptFile("_template.json");
  const pub = toPublicScript(template);
  const blob = JSON.stringify(pub);
  assert.doesNotMatch(blob, /promptHint|metViaLines/);
  assert.equal("reveals" in pub, false);
  assert.ok(blob.includes("hook"));
  assert.ok(blob.includes("narration"));
  const only = toPublicScriptForChapter(template, "example-ch1");
  assert.equal(only?.chapters.length, 1);
  assert.equal(only?.chapters[0]?.id, "example-ch1");
  assert.equal(toPublicScriptForChapter(template, "nope"), null);
});

test("validator rejects broken graphs and banned text", () => {
  const base = readStoryScriptFile("hiyori.json");
  const ok = validateStoryScript(base, { file: "hiyori.json", situations: situationsOf("hiyori") });
  assert.deepEqual(ok, []);

  const dangling = clone(base);
  dangling.chapters[0].beats[0].next = "missing";
  assert.ok(validateStoryScript(dangling).some((issue) => /missing/.test(issue)));

  const orphan = clone(base);
  orphan.chapters[0].beats.push({ id: "island", kind: "line", text: ["ぽつん。"], next: "end-a" });
  assert.ok(validateStoryScript(orphan).some((issue) => /到達できない/.test(issue)));

  const loop = clone(base);
  const b2 = loop.chapters[0].beats.find((beat) => beat.id === "b2-shelter")!;
  b2.next = "b1";
  assert.ok(validateStoryScript(loop).some((issue) => /循環|end に到達できない/.test(issue)));

  const school = clone(base);
  school.chapters[0].beats[0].text = ["制服、似合うでしょ。"];
  assert.ok(validateStoryScript(school).some((issue) => /学校・制服/.test(issue)));

  const age = clone(base);
  age.metViaLines.shelter = "20歳の夏、雨の日のカフェで知り合った";
  assert.ok(validateStoryScript(age).some((issue) => /年齢の数字/.test(issue)));

  const twoMetVia = clone(base);
  const b3 = twoMetVia.chapters[0].beats.find((beat) => beat.id === "b3")!;
  for (const choice of b3.choices ?? []) choice.metVia = "shelter";
  assert.ok(validateStoryScript(twoMetVia).some((issue) => /ちょうど 1 つ/.test(issue)));

  const longLabel = clone(base);
  longLabel.chapters[0].beats[1].choices![0].label = "あ".repeat(21);
  assert.ok(validateStoryScript(longLabel).some((issue) => /20 字以内/.test(issue)));

  const costumeBackdrop = clone(base);
  costumeBackdrop.chapters[0].situationId = "maid";
  assert.ok(
    validateStoryScript(costumeBackdrop, { situations: situationsOf("hiyori") }).some((issue) => /日常場面/.test(issue)),
  );

  const noB1 = clone(base);
  for (const beat of noB1.chapters[0].beats) if (beat.kind === "end") beat.setFlags = [];
  assert.ok(validateStoryScript(noB1).some((issue) => /B1 が立たない/.test(issue)));

  const earlyFree = clone(readStoryScriptFile("_template.json"));
  const ch0 = earlyFree.chapters[0];
  ch0.beats[0].kind = "free";
  ch0.beats[0].promptHint = "初対面。短く。";
  assert.ok(validateStoryScript(earlyFree).some((issue) => /2 ビート以内/.test(issue)));

  const twoFree: StoryScript = clone(readStoryScriptFile("_template.json"));
  const b2seat = twoFree.chapters[0].beats.find((beat) => beat.id === "b2-seat")!;
  b2seat.kind = "free";
  b2seat.promptHint = "短く。";
  assert.ok(validateStoryScript(twoFree).some((issue) => /free は 1 個まで|2 ビート以内/.test(issue)));
});

test("sentence counting ignores ellipses and counts terminal marks", () => {
  assert.equal(sentenceCount("あ……外、すごい降ってきたね。濡れちゃった？"), 2);
  assert.equal(sentenceCount("Bonsoir. 風が、ちょうどいいわね。"), 1);
  assert.equal(sentenceCount("ぽつん"), 1);
  assert.equal(sentenceCount(""), 0);
});
