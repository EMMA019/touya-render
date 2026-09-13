# Oz 対抗ロードマップ（燈夜）

Emma の優先順。入口は状況カード。チャットはカードから開く。PNG が既定。`situations[].video` があれば短いミュートループ（[PR #6](https://github.com/EMMA019/touya-render/pull/6)）。NSFW は [PR #7](https://github.com/EMMA019/touya-render/pull/7) のまま **特別** から（年齢確認だけでは足りない）。カード棚は [PR #8](https://github.com/EMMA019/touya-render/pull/8)。**1通あたり LLM は1回**（監督モデルなし）。

## 1. カード棚 + 動画ループ — PR #8

- Android の既定ホームは `SituationCardShelf`（3 列グリッド）。
- カード: 状況絵・題・キャラ名・親密度。タップで `ChatScreen(characterId, situationId)`。
- フィルタ: 横スクロールのアバター + 日常 / 衣装 / SFW。
- ロック: `nsfwOnly` は特別未満で「特別になってから」。親密な絵は出さない。
- Web は同じ棚をホーム先頭に置く（軽いミラー）。
- 動画: 任意フィールド。PNG 必須のまま。再生実装は PR #6。

## 2. 親密度が返信に効く（+下降）とレベルイベント — この PR

完了。消費された送信は +1 固定ではなく、ユーザー文の軽いヒューリスティックで **-1 / +1 / +2**（床 0）。SSE に `affinityDelta`・新レベル・`bandEvent` を載せる。プロンプトは段階パック（知り合い＝距離、仲良し＝柔らかい、特別＋NSFW だけ親密可、絆＝深い）。LLM は増やさない。

- サーバー: `src/lib/affinity-score.ts` + `applyAffinityDelta`（`/api/chat`）。
- 段階パック: `affinityPromptLine` / `AFFINITY_STAGE_PACKS`（`src/lib/prompt.ts`）。
- 節目: 仲良し / 特別 / 絆への初回横断でワンショット `bandEvent` と段階コピー（バナー）。再横断は出さない。
- UI: 上昇・下降は短いトースト。レベルアップは段階文のバナー。Web / Android。
- NSFW ゲート（特別）は PR #7 のまま。贈り物・日次ループ・Irodori 音声は触らない。

## 3. 今日の相手 / 今日の状況

未着手。日付（JST）で今日のカードを1枚推す。診断の置き換えではなく棚の上の一行。

## 4. 最小の贈り物

未着手。Booth 後でもよい。今は AdMob も課金も増やさない。ローカルファースト。

## 5. キーライン音声 — Irodori-TTS

未着手。後から **Irodori-TTS**（OpenAI 互換 `POST /v1/audio/speech`、ローカルサーバ）。キャラごとの参照音声は後続。カード棚・チャット・親密度ゲートとは独立。
