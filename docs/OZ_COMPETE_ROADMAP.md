# OZ Compete Roadmap

閉じた4人。ローカル優先。送信1回につきチャット LLM は1回。付加機能が止まっても会話は残す。

| # | 項目 | 状態 |
| --- | --- | --- |
| 1 | 閉じた棚（名簿4人） | 出荷済み。`shared/characters/`。TTS マップもこの4人だけ。 |
| 2 | 今夜／日常シチュ | 出荷済み。`shared/presence/` と situations。 |
| 3 | 親密度・絆・記憶 | 出荷済み。 |
| 4 | 贈り物 | 後続。棚・日常を壊さない。 |
| 5 | **キー台詞の声（Irodori-TTS）** | **done** |

## 5. キー台詞の声（Irodori-TTS）

Emma 承認: ローカルの OpenAI 互換サーバ（`POST /v1/audio/speech`、model `irodori-tts`）。キャラごとの参照 wav は後から `voices/{id}.wav`。全メッセージ自動読み上げは MVP に含めない。

### 動き

- `POST /api/tts` `{ characterId, text }` → Irodori へプロキシ → mp3/wav バイト。
- 環境変数: `IRODORI_TTS_BASE_URL`（例 `http://127.0.0.1:8088`）、任意 `IRODORI_TTS_API_KEY`。
- 声 id: `shared/voices.json`、またはキャラ JSON の `voiceId`。閉じた4人だけ。
- 本文は 280 字で切る。同じ characterId+本文は `data/tts-cache/` にハッシュキャッシュ（任意）。
- Web `ChatView` / Android `ChatScreen` のアシスタント吹き出し（状況挨拶を含む）にスピーカー。
- **Irodori 未起動でもビルド・チャット可。** 未設定は 503 JSON。UI は `GET /api/tts` / `ttsConfigured`、または一度の失敗で隠す。
- チャットの LLM 経路は変更しない。贈り物・日常・棚は触らない。音声モデルはコミットしない。

手順は [IRODORI_TTS.md](./IRODORI_TTS.md)。
