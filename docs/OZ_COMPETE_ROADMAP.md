# Oz 対抗ロードマップ（燈夜）

Emma の優先順。カード棚は [PR #8](https://github.com/EMMA019/touya-render/pull/8)。**この PR は 3**（今日の相手 / 今日の状況）。贈り物と音声は触らない。

入口は状況カード。チャットはカードから開く。PNG が既定。`situations[].video` があれば短いミュートループ（[PR #6](https://github.com/EMMA019/touya-render/pull/6)）。NSFW の親密度ゲートは [PR #7](https://github.com/EMMA019/touya-render/pull/7) と両立する（`nsfwOnly` は特別になるまで隠す / ロック）。親密度の返信温度は [PR #9](https://github.com/EMMA019/touya-render/pull/9)。

## 1. カード棚 + 動画ループ — PR #8

- Android の既定ホームは `SituationCardShelf`（3 列グリッド）。
- カード: 状況絵・題・キャラ名・親密度。タップで `ChatScreen(characterId, situationId)`。
- フィルタ: 横スクロールのアバター + 日常 / 衣装 / SFW。
- ロック: `nsfwOnly` は特別未満で「特別になってから」。親密な絵は出さない。
- Web は同じ棚をホーム先頭に置く（軽いミラー）。
- 動画: 任意フィールド。PNG 必須のまま。再生実装は PR #6 があればそれを使う。

## 2. 親密度が返信に効く（+下降）とレベルイベント

未着手。返信の温度をレベルで変える。下がる経路と「特別になった」などの節目。チャット本体と NSFW ゲートは壊さない。

## 3. 今日の相手 / 今日の状況 — この PR

完了。訪問者ごと・JST 日付で今日の相手 1 人 + 今日のシチュ 1 枚。解放済みかつ SFW 安全。`nsfwOnly` は特別でも棚の今日枠には出さない。同じ日は安定。日付が変わると名簿を回す。LLM は増やさない。

- `GET /api/daily` と棚用 `GET /api/characters` の `daily`: `{ date, characterId, situationId, title, blurb, untilNext }`
- Web / Android の棚の上に「今日の相手」「今日のシチュ」。タップでその組のチャット。
- 任意の薄いチェックイン（`firstToday`）。通貨も贈り物もなし。
- 任意の `あとNで特別`（次の親密度）。

## 4. 最小の贈り物

未着手。Booth 後でもよい。今は AdMob も課金も増やさない。ローカルファースト。

## 5. キーライン音声 — Irodori-TTS

未着手。後から **Irodori-TTS**（OpenAI 互換 `POST /v1/audio/speech`、ローカルサーバ）。キャラごとの参照音声は後続。カード棚・チャット・親密度ゲートとは独立。
