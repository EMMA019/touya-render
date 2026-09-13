import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  IRODORI_TTS_MODEL,
  MAX_TTS_CHARS,
  TTS_NOT_CONFIGURED,
  TTS_NOT_CONFIGURED_JA,
  TTS_UNAVAILABLE,
  capTtsText,
  evaluateTtsRequest,
  hasIrodoriTts,
  isTtsFailure,
  irodoriTtsApiKey,
  irodoriTtsBaseUrl,
  loadVoiceMap,
  parseVoiceMap,
  readTtsCache,
  resolveVoiceId,
  shapeSpeechRequest,
  synthesizeSpeech,
  ttsCacheKey,
  writeTtsCache,
} from "./tts";

const SHIPPED = ["hiyori", "rione", "shiraishi", "clara"] as const;
const VOICES = Object.fromEntries(SHIPPED.map((id) => [id, id]));

function readyHiyori(text = "席、空いてる。") {
  const verdict = evaluateTtsRequest(
    { characterId: "hiyori", text },
    { configured: true, voiceMap: VOICES, knownCharacter: (id) => id === "hiyori" },
  );
  assert.equal(verdict.ok, true);
  if (!verdict.ok) throw new Error("expected ready");
  return verdict;
}

test("TTS env is off unless IRODORI_TTS_BASE_URL is set", () => {
  const empty = {};
  assert.equal(hasIrodoriTts(empty), false);
  assert.equal(irodoriTtsBaseUrl(empty), "");
  assert.equal(irodoriTtsApiKey(empty), "");

  const env = {
    IRODORI_TTS_BASE_URL: "http://127.0.0.1:8088/",
    IRODORI_TTS_API_KEY: "secret",
  };
  assert.equal(hasIrodoriTts(env), true);
  assert.equal(irodoriTtsBaseUrl(env), "http://127.0.0.1:8088");
  assert.equal(irodoriTtsApiKey(env), "secret");
});

test("missing config is 503 with a clear JSON error and does not fetch", async () => {
  const missing = evaluateTtsRequest(
    { characterId: "hiyori", text: "こんにちは" },
    { configured: false, voiceMap: VOICES },
  );
  assert.deepEqual(missing, {
    ok: false,
    status: 503,
    error: TTS_NOT_CONFIGURED,
    message: TTS_NOT_CONFIGURED_JA,
  });

  let called = 0;
  const audio = await synthesizeSpeech(readyHiyori(), {
    env: {},
    fetchImpl: async () => {
      called += 1;
      throw new Error("should not fetch");
    },
  });
  assert.equal(called, 0);
  assert.equal(isTtsFailure(audio), true);
  if (isTtsFailure(audio)) {
    assert.equal(audio.error, TTS_NOT_CONFIGURED);
    assert.equal(audio.status, 503);
  }
});

test("text is trimmed and capped before the Irodori body is shaped", () => {
  const long = `  ${"あ".repeat(MAX_TTS_CHARS + 40)}  `;
  assert.equal(capTtsText(long).length, MAX_TTS_CHARS);
  assert.equal(capTtsText("  席、空いてる。  "), "席、空いてる。");

  const request = shapeSpeechRequest({ text: long, voice: "hiyori" });
  assert.equal(request.model, IRODORI_TTS_MODEL);
  assert.equal(request.voice, "hiyori");
  assert.equal(request.response_format, "mp3");
  assert.equal(request.input.length, MAX_TTS_CHARS);
  assert.equal(request.input.startsWith("あ"), true);
  assert.equal(request.input.includes(" "), false);
});

test("evaluateTtsRequest rejects empty text, unknown character, and unmapped voice", () => {
  const known = (id: string) => id === "hiyori";
  const empty = evaluateTtsRequest(
    { characterId: "hiyori", text: "   " },
    { configured: true, voiceMap: VOICES, knownCharacter: known },
  );
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.error, "empty");

  const ghost = evaluateTtsRequest(
    { characterId: "ghost", text: "hello" },
    { configured: true, voiceMap: VOICES, knownCharacter: known },
  );
  assert.equal(ghost.ok, false);
  if (!ghost.ok) assert.equal(ghost.error, "unknown_character");

  const unmapped = evaluateTtsRequest(
    { characterId: "example", text: "hello" },
    { configured: true, voiceMap: VOICES, knownCharacter: (id) => id === "example" },
  );
  assert.equal(unmapped.ok, false);
  if (!unmapped.ok) assert.equal(unmapped.error, "unknown_voice");

  const capped = evaluateTtsRequest(
    { characterId: "hiyori", text: "あ".repeat(MAX_TTS_CHARS + 12) },
    { configured: true, voiceMap: VOICES, knownCharacter: known },
  );
  assert.equal(capped.ok, true);
  if (capped.ok) assert.equal(capped.text.length, MAX_TTS_CHARS);

  const override = evaluateTtsRequest(
    { characterId: "hiyori", text: "席、空いてる。" },
    {
      configured: true,
      voiceMap: VOICES,
      knownCharacter: known,
      characterVoiceId: () => "hiyori-soft",
    },
  );
  assert.equal(override.ok, true);
  if (override.ok) {
    assert.equal(override.voice, "hiyori-soft");
    assert.equal(override.request.voice, "hiyori-soft");
  }
});

test("closed voice map is the shipped four; character voiceId may override", () => {
  const map = loadVoiceMap();
  assert.deepEqual(Object.keys(map).sort(), [...SHIPPED].sort());
  assert.deepEqual(map, { ...VOICES });

  assert.equal(resolveVoiceId("hiyori", VOICES), "hiyori");
  assert.equal(resolveVoiceId("hiyori", VOICES, "  hiyori-soft  "), "hiyori-soft");
  assert.equal(resolveVoiceId("suzune", VOICES, "suzune"), null);
  assert.equal(resolveVoiceId("hiyori", {}, "hiyori"), null);

  const nested = parseVoiceMap({ voices: { hiyori: "hiyori-ref" }, rione: "ignored-when-nested" });
  assert.equal(nested.hiyori, "hiyori-ref");
});

test("cache key is stable for the same characterId+capped text", () => {
  const a = ttsCacheKey("hiyori", "  席、空いてる。  ");
  const b = ttsCacheKey("hiyori", "席、空いてる。");
  const c = ttsCacheKey("rione", "席、空いてる。");
  assert.equal(a, b);
  assert.equal(a.length, 64);
  assert.notEqual(a, c);
});

test("proxy shapes OpenAI speech and returns audio bytes; Irodori errors are 503", async () => {
  const ready = readyHiyori("今日は温かいの、飲む？");
  let url = "";
  let payload: {
    model?: string;
    input?: string;
    voice?: string;
    response_format?: string;
  } = {};
  let auth = "";

  const audio = await synthesizeSpeech(ready, {
    env: { IRODORI_TTS_BASE_URL: "http://127.0.0.1:8088", IRODORI_TTS_API_KEY: "k" },
    fetchImpl: async (input, init) => {
      url = String(input);
      auth = new Headers(init?.headers).get("authorization") ?? "";
      payload = JSON.parse(String(init?.body)) as typeof payload;
      return new Response(Uint8Array.from([1, 2, 3, 4]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      });
    },
    readCache: async () => null,
    writeCache: async () => undefined,
  });

  assert.equal(url, "http://127.0.0.1:8088/v1/audio/speech");
  assert.equal(auth, "Bearer k");
  assert.deepEqual(payload, {
    model: "irodori-tts",
    input: "今日は温かいの、飲む？",
    voice: "hiyori",
    response_format: "mp3",
  });
  assert.equal(isTtsFailure(audio), false);
  if (!isTtsFailure(audio)) {
    assert.deepEqual([...audio.bytes], [1, 2, 3, 4]);
    assert.equal(audio.contentType, "audio/mpeg");
    assert.equal(audio.cached, false);
  }

  const down = await synthesizeSpeech(ready, {
    env: { IRODORI_TTS_BASE_URL: "http://127.0.0.1:8088" },
    fetchImpl: async () => new Response("nope", { status: 502 }),
    readCache: async () => null,
  });
  assert.equal(isTtsFailure(down), true);
  if (isTtsFailure(down)) {
    assert.equal(down.error, TTS_UNAVAILABLE);
    assert.equal(down.status, 503);
  }

  const offline = await synthesizeSpeech(ready, {
    env: { IRODORI_TTS_BASE_URL: "http://127.0.0.1:8088" },
    fetchImpl: async () => {
      throw new Error("connect ECONNREFUSED");
    },
    readCache: async () => null,
  });
  assert.equal(isTtsFailure(offline), true);
  if (isTtsFailure(offline)) assert.equal(offline.error, TTS_UNAVAILABLE);
});

test("optional disk cache is keyed by hash(characterId+text)", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "touya-tts-"));
  const prev = process.env.TTS_CACHE_DIR;
  process.env.TTS_CACHE_DIR = dir;
  try {
    const key = ttsCacheKey("clara", "Bonsoir.");
    await writeTtsCache(key, {
      bytes: Uint8Array.from([9, 8, 7]),
      contentType: "audio/mpeg",
      cached: false,
    });
    const hit = await readTtsCache(key);
    assert.ok(hit);
    assert.deepEqual([...hit.bytes], [9, 8, 7]);
    assert.equal(hit.cached, true);
    const raw = await readFile(path.join(dir, `${key}.mp3`));
    assert.deepEqual([...raw], [9, 8, 7]);
  } finally {
    if (prev === undefined) delete process.env.TTS_CACHE_DIR;
    else process.env.TTS_CACHE_DIR = prev;
    await rm(dir, { recursive: true, force: true });
  }
});
