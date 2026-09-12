# SFW / NSFW dual-mode (skeleton)

燈夜は **同じアプリ** のまま、訪問者（インストール UUID）ごとにモードを持ちます。これはゲート・フラグ・UI・広告停止の骨格だけです。NSFW 本文生成や別モデルへの差し替えは **まだ入れていません**。

## 今あるもの

| 約束 | 動き |
| --- | --- |
| 既定 | `chatMode: sfw`。今までの気軽なコンパニオン。性的な送信は DeepSeek に送らない。AdMob 可。 |
| 年齢確認 | アプリ内の自己申告（「18歳以上です」→ 続ける / やめる）。サーバーが `ageConfirmed` / `ageConfirmedAt` を訪問者ハッシュに保存する。 |
| NSFW | 年齢確認後だけ。気軽なコンパニオン用の性的拒否は通さない。未成年・違法は **どちらのモードでも** 拒否。 |
| 広告 | NSFW 中はバナーもリワードも **完全オフ**。クライアントが隠すだけでなく、`POST /api/reward` も 403。 |
| 強制 | クライアントの `mode` フラグだけでは足りない。年齢未確認で NSFW を送ると `nsfw_age_required`（403）。 |

保存先: `data/visitors.json`（`VISITOR_STORE_PATH`）。キーは既存どおりハッシュ済み訪問者 ID。生 UUID は置かない。

## API

- `GET /api/session` / `GET /api/usage` / `GET /api/health` / `GET /api/mode`  
  `chatMode` / `ageConfirmed` / `ageConfirmedAt` / `adsEnabled` を返す（`mode` オブジェクトでも同じ）。
- `POST /api/mode` `{ confirmAge?: true, chatMode?: "sfw" \| "nsfw" }`
- `POST /api/chat` は任意で `mode` を受け取る。サーバーの年齢確認と照合する。

## 後回し（この骨格ではやらない）

- NSFW 向けのプロンプト / 口調 / 本文生成
- 検閲なしモデルや DeepSeek 以外への差し替え
- 1通あたり複数回のモデル呼び出し
- キャラを「女子高生」にする、年齢数字を出す
- 未成年・違法コンテンツの緩和（緩和しない）

SFW のとき、既存の性的ゲート・3回エスカレーション・出力の性的上書きはそのままです。
