import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_COMPLETION_TOKENS,
  MAX_COMPLETION_TOKENS_LONGFORM,
  MAX_COMPLETION_TOKENS_STORY,
} from "./config";
import {
  DEFAULT_REPLY_STYLE,
  KEEP_THE_THREAD,
  REPLY_STYLE_LABELS,
  REPLY_STYLE_LONGFORM,
  REPLY_STYLE_STORY,
  REPLY_STYLES,
  coerceReplyStyle,
  completionTokensFor,
  parseReplyStyle,
  replyStyleFor,
  replyStyleLabel,
} from "./reply-style";

test("reply styles are basic / longform / story with Japanese labels", () => {
  assert.equal(DEFAULT_REPLY_STYLE, "basic");
  assert.deepEqual([...REPLY_STYLES], ["basic", "longform", "story"]);
  assert.equal(REPLY_STYLE_LABELS.basic, "基本");
  assert.equal(REPLY_STYLE_LABELS.longform, "長文");
  assert.equal(REPLY_STYLE_LABELS.story, "ストーリー");
  assert.equal(replyStyleLabel("basic"), "基本");
  assert.equal(parseReplyStyle("longform"), "longform");
  assert.equal(parseReplyStyle("story"), "story");
  assert.equal(parseReplyStyle("SFW"), null);
  assert.equal(coerceReplyStyle("nope"), "basic");
  assert.equal(coerceReplyStyle(undefined), "basic");
});

test("basic keeps the existing short-thread contract", () => {
  const text = replyStyleFor("basic");
  assert.equal(text, KEEP_THE_THREAD);
  assert.match(text, /会話の続き/);
  assert.match(text, /短い返事/);
  assert.doesNotMatch(text, /返信スタイル・長文/);
  assert.doesNotMatch(text, /返信スタイル・ストーリー/);
  assert.equal(completionTokensFor("basic"), MAX_COMPLETION_TOKENS);
});

test("longform asks for longer replies without forking NSFW policy", () => {
  const text = replyStyleFor("longform");
  assert.equal(text, REPLY_STYLE_LONGFORM);
  assert.match(text, /返信スタイル・長文/);
  assert.match(text, /6〜12文/);
  assert.doesNotMatch(text, /短い返事のあと/);
  assert.doesNotMatch(text, /性的/);
  assert.doesNotMatch(text, /NSFW/);
  assert.equal(completionTokensFor("longform"), MAX_COMPLETION_TOKENS_LONGFORM);
  assert.ok(MAX_COMPLETION_TOKENS_LONGFORM > MAX_COMPLETION_TOKENS);
});

test("story asks for scene-plus-dialogue without forking NSFW policy", () => {
  const text = replyStyleFor("story");
  assert.equal(text, REPLY_STYLE_STORY);
  assert.match(text, /返信スタイル・ストーリー/);
  assert.match(text, /地の文/);
  assert.match(text, /台詞/);
  assert.doesNotMatch(text, /短い返事のあと/);
  assert.doesNotMatch(text, /性的/);
  assert.doesNotMatch(text, /NSFW/);
  assert.equal(completionTokensFor("story"), MAX_COMPLETION_TOKENS_STORY);
  assert.ok(MAX_COMPLETION_TOKENS_STORY > MAX_COMPLETION_TOKENS);
});
