# Oz 対抗ロードマップ（燈夜）

Emma の優先順。カード棚は [PR #8](https://github.com/EMMA019/touya-render/pull/8)。今日の相手は [PR #10](https://github.com/EMMA019/touya-render/pull/10)。親密度の返信温度は [PR #9](https://github.com/EMMA019/touya-render/pull/9)。NSFW の親密度ゲートは [PR #7](https://github.com/EMMA019/touya-render/pull/7)。**この PR は 4**（最小の贈り物）。音声は触らない。

入口は状況カード。チャットはカードから開く。PNG が既定。`situations[].video` があれば短いミュートループ（[PR #6](https://github.com/EMMA019/touya-render/pull/6)）。**1通あたり LLM は1回**（監督モデルなし）。贈り物は定型お礼だけ。生成は増やさない。

## 1. カード棚 + 動画ループ — PR #8

- Android の既定ホームは `SituationCardShelf`（3 列グリッド）。
- カード: 状況絵・題・キャラ名・親密度。タップで `ChatScreen(characterId, situationId)`。
- フィルタ: 横スクロールのアバター + 日常 / 衣装 / SFW。
- ロック: `nsfwOnly` は特別未満で「特別になってから」。親密な絵は出さない。
- Web は同じ棚をホーム先頭に置く（軽いミラー）。
- 動画: 任意フィールド。PNG 必須のまま。再生実装は PR #6 があればそれを使う。

## 2. 親密度が返信に効く（+下降）とレベルイベント — PR #9

返信の温度をレベルで変える。下がる経路と「特別になった」などの節目。チャット本体と NSFW ゲートは壊さない。

## 3. 今日の相手 / 今日の状況 — PR #10

日付（JST）で今日のカードを1枚推す。診断の置き換えではなく棚の上の一行。

## 4. 最小の贈り物 — この PR

完了。閉じたカタログ 6 点（花・お菓子・本・お守り・紅茶・手紙）。通貨も広告も Irodori もなし。1 キャラあたり JST 1 日 1 つ。親密度は `applyAffinityDelta`（+2〜+4、お好みは +1）。特別へ届いてよい。NSFW は特別未満では開かない（PR #7）。LLM は増やさない。定型お礼 + 親密度トーストだけ。

- `shared/gifts.json` — `id` / `name` / `hint` / `affinityDelta` / `premium: false`（Booth 後の有料スキン用フック。決済 UI なし）/ 任意の `characterFavorites` と `thanks`
- `GET /api/gifts`・`POST /api/gifts` `{ characterId, giftId }` — 親密度ストア再利用。日次キャップ。チャット枠は消費しない
- Web / Android チャットの「贈る」シート。今日贈済みなら無効
- 棚が来たら同じシートを載せるだけ。カタログはユーザー追加不可

## 5. キーライン音声 — Irodori-TTS

未着手。後から **Irodori-TTS**（OpenAI 互換 `POST /v1/audio/speech`、ローカルサーバ）。キャラごとの参照音声は後続。カード棚・チャット・親密度ゲートとは独立。
