import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { irodoriTtsApiKey, irodoriTtsBaseUrl } from "./config";

export { hasIrodoriTts, irodoriTtsApiKey, irodoriTtsBaseUrl } from "./config";

/** OpenAI-compatible model id on Irodori-TTS-Server. */
export const IRODORI_TTS_MODEL = "irodori-tts";
/** Key-line cap. Longer assistant turns are truncated; chat itself is unchanged. */
export const MAX_TTS_CHARS = 280;
export const IRODORI_TTS_FORMAT = "mp3";
export const IRODORI_TTS_TIMEOUT_MS = 60_000;

export const TTS_NOT_CONFIGURED = "tts_not_configured";
export const TTS_UNAVAILABLE = "tts_unavailable";
export const TTS_NOT_CONFIGURED_JA =
  "音声は未設定です。IRODORI_TTS_BASE_URL を入れると使えます。チャットはそのまま使えます。";
export const TTS_UNAVAILABLE_JA =
  "音声サーバーに届きません。チャットはそのまま使えます。";
export const TTS_UNKNOWN_VOICE_JA = "このキャラの声はまだありません。";

export type IrodoriSpeechRequest = {
  model: typeof IRODORI_TTS_MODEL;
  input: string;
  voice: string;
  response_format: typeof IRODORI_TTS_FORMAT;
};

export type TtsFailure = {
  ok: false;
  status: number;
  error: string;
  message: string;
};

export type TtsReady = {
  ok: true;
  characterId: string;
  text: string;
  voice: string;
  request: IrodoriSpeechRequest;
};

export type TtsVerdict = TtsReady | TtsFailure;

export type TtsAudio = {
  bytes: Uint8Array;
  contentType: string;
  cached: boolean;
};

export function isTtsFailure(value: TtsAudio | TtsFailure): value is TtsFailure {
  return "ok" in value && value.ok === false;
}

export function capTtsText(text: string, max = MAX_TTS_CHARS): string {
  return text.trim().slice(0, max);
}

export function shapeSpeechRequest(input: { text: string; voice: string }): IrodoriSpeechRequest {
  return {
    model: IRODORI_TTS_MODEL,
    input: capTtsText(input.text),
    voice: input.voice,
    response_format: IRODORI_TTS_FORMAT,
  };
}

export function ttsCacheKey(characterId: string, text: string): string {
  return createHash("sha256").update(`${characterId}\n${capTtsText(text)}`, "utf8").digest("hex");
}

export function parseVoiceMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const root = raw as Record<string, unknown>;
  const source =
    root.voices && typeof root.voices === "object" && !Array.isArray(root.voices)
      ? (root.voices as Record<string, unknown>)
      : root;
  const map: Record<string, string> = {};
  for (const [characterId, voice] of Object.entries(source)) {
    if (characterId === "voices") continue;
    if (typeof voice !== "string") continue;
    const id = characterId.trim();
    const voiceId = voice.trim();
    if (!id || !voiceId) continue;
    map[id] = voiceId;
  }
  return map;
}

export function loadVoiceMap(file = voicesFile()): Record<string, string> {
  try {
    if (!existsSync(file)) return {};
    return parseVoiceMap(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    return {};
  }
}

export function resolveVoiceId(
  characterId: string,
  voiceMap: Record<string, string>,
  characterVoiceId?: string | null,
): string | null {
  if (!(characterId in voiceMap)) return null;
  const override = characterVoiceId?.trim();
  if (override) return override;
  const mapped = voiceMap[characterId]?.trim();
  return mapped || null;
}

export function evaluateTtsRequest(
  body: { characterId?: unknown; text?: unknown },
  options: {
    configured: boolean;
    voiceMap: Record<string, string>;
    characterVoiceId?: (id: string) => string | undefined;
    knownCharacter?: (id: string) => boolean;
  },
): TtsVerdict {
  if (!options.configured) {
    return {
      ok: false,
      status: 503,
      error: TTS_NOT_CONFIGURED,
      message: TTS_NOT_CONFIGURED_JA,
    };
  }

  const characterId = typeof body.characterId === "string" ? body.characterId.trim() : "";
  const text = capTtsText(typeof body.text === "string" ? body.text : "");
  if (!characterId || !text) {
    return { ok: false, status: 400, error: "empty", message: "characterId と text が必要です。" };
  }
  if (options.knownCharacter && !options.knownCharacter(characterId)) {
    return { ok: false, status: 400, error: "unknown_character", message: "unknown_character" };
  }

  const voice = resolveVoiceId(characterId, options.voiceMap, options.characterVoiceId?.(characterId));
  if (!voice) {
    return { ok: false, status: 400, error: "unknown_voice", message: TTS_UNKNOWN_VOICE_JA };
  }

  return {
    ok: true,
    characterId,
    text,
    voice,
    request: shapeSpeechRequest({ text, voice }),
  };
}

export async function synthesizeSpeech(
  ready: TtsReady,
  options: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
    readCache?: (key: string) => Promise<TtsAudio | null>;
    writeCache?: (key: string, audio: TtsAudio) => Promise<void>;
  } = {},
): Promise<TtsAudio | TtsFailure> {
  const env = options.env ?? process.env;
  const baseUrl = irodoriTtsBaseUrl(env);
  const apiKey = irodoriTtsApiKey(env);
  if (!baseUrl) {
    return {
      ok: false,
      status: 503,
      error: TTS_NOT_CONFIGURED,
      message: TTS_NOT_CONFIGURED_JA,
    };
  }

  const key = ttsCacheKey(ready.characterId, ready.text);
  const cached = options.readCache
    ? await options.readCache(key)
    : await readTtsCache(key);
  if (cached) return { ...cached, cached: true };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/v1/audio/speech`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(IRODORI_TTS_TIMEOUT_MS),
      body: JSON.stringify(ready.request),
    });
  } catch {
    return {
      ok: false,
      status: 503,
      error: TTS_UNAVAILABLE,
      message: TTS_UNAVAILABLE_JA,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: 503,
      error: TTS_UNAVAILABLE,
      message: TTS_UNAVAILABLE_JA,
    };
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) {
    return {
      ok: false,
      status: 503,
      error: TTS_UNAVAILABLE,
      message: TTS_UNAVAILABLE_JA,
    };
  }

  const contentType = normalizeAudioType(response.headers.get("content-type"));
  const audio: TtsAudio = { bytes, contentType, cached: false };
  try {
    if (options.writeCache) await options.writeCache(key, audio);
    else await writeTtsCache(key, audio);
  } catch {
    // Cache is optional. Ephemeral disks and permission errors must not fail speak.
  }
  return audio;
}

export function ttsCacheDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.TTS_CACHE_DIR?.trim() || path.join(process.cwd(), "data", "tts-cache");
}

export async function readTtsCache(key: string, dir = ttsCacheDir()): Promise<TtsAudio | null> {
  for (const [ext, contentType] of [
    ["mp3", "audio/mpeg"],
    ["wav", "audio/wav"],
  ] as const) {
    try {
      const bytes = new Uint8Array(await readFile(path.join(dir, `${key}.${ext}`)));
      if (bytes.byteLength > 0) return { bytes, contentType, cached: true };
    } catch {
      // try next extension
    }
  }
  return null;
}

export async function writeTtsCache(
  key: string,
  audio: TtsAudio,
  dir = ttsCacheDir(),
): Promise<void> {
  const ext = audio.contentType.includes("wav") ? "wav" : "mp3";
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${key}.${ext}`), audio.bytes);
}

function normalizeAudioType(value: string | null): string {
  const raw = (value ?? "").split(";")[0]?.trim().toLowerCase();
  if (raw === "audio/wav" || raw === "audio/x-wav" || raw === "audio/wave") return "audio/wav";
  if (raw === "audio/mpeg" || raw === "audio/mp3") return "audio/mpeg";
  return "audio/mpeg";
}

function voicesFile(): string {
  return path.join(process.cwd(), "shared", "voices.json");
}
