# SFW / NSFW dual-mode (skeleton)

燈夜は **同じアプリ** のまま、訪問者（インストール UUID）ごとにモードを持ちます。骨格はゲート・フラグ・UI・広告停止と、本文の振り分け（SFW=DeepSeek / NSFW=OpenRouter）です。システムプロンプトのコンパニオン契約はモードで切り替えます。

## 今あるもの

| 約束 | 動き |
| --- | --- |
| 既定 | `chatMode: sfw`。今までの気軽なコンパニオン。性的な送信は DeepSeek に送らない。AdMob 可。 |
| 年齢確認 | アプリ内の自己申告（「18歳以上です」→ 続ける / やめる）。サーバーが `ageConfirmed` / `ageConfirmedAt` を訪問者ハッシュに保存する。 |
| NSFW | 年齢確認後だけ。気軽なコンパニオン用の性的拒否は通さない。プロンプトはおとなの合意ある会話を許可（未成年・女子高生枠・違法は禁止のまま）。未成年・違法は **どちらのモードでも** 拒否。 |
| 広告 | NSFW 中はバナーもリワードも **完全オフ**。クライアントが隠すだけでなく、`POST /api/reward` も 403。 |
| 強制 | クライアントの `mode` フラグだけでは足りない。年齢未確認で NSFW を送ると `nsfw_age_required`（403）。 |

保存先: `data/visitors.json`（`VISITOR_STORE_PATH`）。キーは既存どおりハッシュ済み訪問者 ID。生 UUID は置かない。

## API

- `GET /api/session` / `GET /api/usage` / `GET /api/health` / `GET /api/mode`  
  `chatMode` / `ageConfirmed` / `ageConfirmedAt` / `adsEnabled` を返す（`mode` オブジェクトでも同じ）。
- `POST /api/mode` `{ confirmAge?: true, chatMode?: "sfw" \| "nsfw" }`
- `POST /api/chat` は任意で `mode` を受け取る。サーバーの年齢確認と照合する。

## モデルの振り分け

| モード | 呼び出し先 | 鍵 |
| --- | --- | --- |
| SFW | DeepSeek（`DEEPSEEK_API_KEY`） | 無いときはデモ返答。DeepSeek 以外には落ちない。 |
| NSFW | OpenRouter（`OPENROUTER_API_KEY`） | **無いときは 503。DeepSeek には切り替えない。** |

1通あたり LLM は1回です。鍵はサーバー専用です。`NEXT_PUBLIC_*` には入れません。

### Render に入れる値

Dashboard → touya Web Service → **Environment**。`render.yaml` にも同じキーがあります（値は Dashboard で入れる）。

| 変数 | 必須 | 値 |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | NSFW を出すなら必須 | OpenRouter のキー。空のまま NSFW すると 503 `openrouter_missing`。 |
| `OPENROUTER_NSFW_MODEL` | 任意 | 空なら `nousresearch/hermes-3-llama-3.1-70b`（低拒否 / ロールプレイ系カタログ）。 |
| `OPENROUTER_BASE_URL` | 任意 | 空なら `https://openrouter.ai/api/v1`。 |
| `DEEPSEEK_API_KEY` | SFW 本番 | 今までどおり。NSFW の予備には使わない。 |

`buildSystemPrompt` は `chatMode` を受け取る。SFW は従来の `COMPANION_NOT_NSFW` と着衣の場面制約。NSFW は `COMPANION_ADULT_OK` に差し替え、下着・肌の強調禁止は外す（画像アセットは変えない）。振り分けと 1通1回の LLM は変えない。

## 後回し

- NSFW 向けの口調・本文の仕上げ（画像アセット含む）
- 1通あたり複数回のモデル呼び出し
- キャラを「女子高生」にする、年齢数字を出す
- 未成年・違法コンテンツの緩和（緩和しない）

SFW のとき、既存の性的ゲート・3回エスカレーション・出力の性的上書きはそのままです。
