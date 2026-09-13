# Irodori-TTS（キー台詞の声）

燈夜の音声は **オンデマンド** です。チャットの LLM は今までどおり 1 通 1 回。アシスタント吹き出し（状況の挨拶を含む）のスピーカーを押したときだけ `POST /api/tts` が Irodori-TTS-Server の OpenAI 互換 `POST /v1/audio/speech` に届きます。

**Irodori が無くてもビルドもチャットも動きます。** `IRODORI_TTS_BASE_URL` が空なら `/api/tts` は 503、UI はスピーカーを出さないか、一度失敗したら隠します。

モデル本体はリポジトリに入れません。

## 閉じた声マップ（4人だけ）

| characterId | Irodori `voice` |
| --- | --- |
| `hiyori` | `hiyori` |
| `rione` | `rione` |
| `shiraishi` | `shiraishi` |
| `clara` | `clara` |

正本は `shared/voices.json`。キャラ JSON の `voiceId` があればそちらを使います。マップに無い id は 400 `unknown_voice` です。5人目を足しても、声を足すまでスピーカーは使いません。

## Irodori-TTS-Server を動かす

公式: [Aratako/Irodori-TTS-Server](https://github.com/Aratako/Irodori-TTS-Server)

```bash
git clone https://github.com/Aratako/Irodori-TTS-Server.git
cd Irodori-TTS-Server
uv sync --extra cu128   # GPU が無いときは --extra cpu
cp .env.example .env
uv run --no-sync python -m irodori_openai_tts --host 0.0.0.0 --port 8088
```

ヘルス:

```bash
curl http://127.0.0.1:8088/health
```

参照 wav を `voices/` に置くと、ファイル名の stem が voice id になります。

```text
voices/
  hiyori.wav
  rione.wav
  shiraishi.wav
  clara.wav
```

（任意）`voices/voices.json` で複数クリップを1つの id にまとめられます。燈夜側のマップは上の4 id のままです。

手元確認:

```bash
curl http://127.0.0.1:8088/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"model":"irodori-tts","input":"席、空いてる。","voice":"hiyori","response_format":"mp3"}' \
  --output /tmp/hiyori.mp3
```

## 燈夜側の環境変数

ルートの `.env.local`:

| 変数 | 役割 |
| --- | --- |
| `IRODORI_TTS_BASE_URL` | 例: `http://127.0.0.1:8088`。空 = 音声オフ。 |
| `IRODORI_TTS_API_KEY` | Irodori の `IRODORI_API_KEY` を付けたときだけ。 |
| `TTS_CACHE_DIR` | キー台詞キャッシュ。既定 `./data/tts-cache`。 |

```bash
IRODORI_TTS_BASE_URL=http://127.0.0.1:8088
```

燈夜 API（`npm run dev`、既定 `http://0.0.0.0:43127`）を出したまま、ブラウザか Pixel からスピーカーを押します。テキストは 280 字で切ります。同じ characterId+本文はハッシュして `data/tts-cache/` に残します（ディスクが消えてもチャットは壊れません）。

## Pixel（同じ Wi‑Fi）

Irodori も燈夜 API も **PC 上** で動かします。Pixel は燈夜 API だけ見ます。API が `127.0.0.1:8088` の Irodori にプロキシします。

1. PC と Pixel を同じ Wi‑Fi にする（ゲスト VLAN や AP 分離は不可）。
2. PC の IPv4 を確認する（`ip a` / `ipconfig`）。例: `192.168.0.12`。
3. 燈夜: `npm run dev`（`0.0.0.0:43127`）。
4. Irodori: `--host 0.0.0.0 --port 8088`。`.env.local` は `IRODORI_TTS_BASE_URL=http://127.0.0.1:8088` のままでよい（プロキシはサーバー側）。
5. Android の `API_BASE_URL` を `http://192.168.0.12:43127` にする。`127.0.0.1` は端末自身なので届きません。エミュレータは `http://10.0.2.2:43127`。
6. PC のファイアウォールで **43127** を許可する。Irodori の 8088 は LAN に開けなくてよい。

Ollama と同じ置き方です。モデルは PC、端末は API だけ。

## API

```
GET  /api/tts     { configured: true|false }   Irodori には触れない
POST /api/tts     { characterId, text }         audio/mpeg または 503 JSON
GET  /api/health  ttsConfigured / tts.configured
```

未設定の 503 例:

```json
{
  "error": "tts_not_configured",
  "message": "音声は未設定です。IRODORI_TTS_BASE_URL を入れると使えます。チャットはそのまま使えます。"
}
```

Irodori が落ちていてもチャットは使えます。スピーカーは一度失敗すると隠れます。
