# 章テーブル（帯の入口イベント）

設計の本文は [LOVEPLUS_ROMANCE_SLG.md](LOVEPLUS_ROMANCE_SLG.md)。実装は [MEETING_FLOW_SPEC.md](MEETING_FLOW_SPEC.md)。

章は **帯の入口に置く短い台本**。LLM は呼ばない（`free` ビートを置いた章だけ、そのビートで通常チャット 1 回）。章は一度クリアすると二度と出ない。断れる章は Ch2 だけ。

## 1. 章一覧

| 章 | 名前 | 帯 | 開始条件（全部） | クリア条件 | 立つフラグ | クリアで開くもの | 台本 id |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Ch0** | 出会い | 知り合い（L0） | story に `B1` が無い。チャット画面を開いた | `end` ビート到達 | `B1 met` ＋ `metVia`。選択によっては `B2 named` | 通常チャット。既定場面（衣装なし）。ハロウィン季節中なら季節場面（minLevel 0 のもの） | `{characterId}-ch0` |
| **Ch1** | 顔なじみ | 仲良し（L1） | `B1` あり。`count >= 10` | `end` ビート到達（選択肢で「また来る」系を選ぶ。全選択肢が `B3` を立てる。分岐は口調だけ） | `B3 regular` | 実効帯 1。`costume` 場面（minLevel 1）。presence の `familiar` 提案 | `{characterId}-ch1` |
| **Ch2** | 告白 | 特別（L2） | `B3` あり。`count >= 30`。`deferredUntil` が無いか `count >= deferredUntil` | 「受ける」を選ぶ → `end` | `B4 confessed` | 実効帯 2。minLevel 2 場面。**NSFW モード**（年齢確認済みなら） | `{characterId}-ch2` |
| | | | | 「まだ待って」を選ぶ → `defer` ビート → `beat = null`、`deferredUntil = count + 5` | なし | なし（仲良しのまま。5 通後に再提示） | |
| **Ch3** | 絆 | 絆（L3） | `B4` あり。`count >= 60` | `end` ビート到達 | `B5 bonded` | 実効帯 3。minLevel 3 の台詞・場面。presence の `regular` | `{characterId}-ch3` |

`count` は消費した送信の累計（`data/affinity.json`）。閾値は `shared/affinity.json` の `at` と同じ値を使う。**日数条件はどの章にも無い。**

## 2. Ch0 出会いのクリア条件（詳細）

| 項目 | 値 |
| --- | --- |
| 発火 | `GET /api/companion` の `story.beat == null && !flags.B1`。クライアントは `composeOpening` を呼ばず、台本の `entry` から描く |
| 必須ビート | `entry`（`line` または `choice`）→ … → `end` |
| 必須選択 | `metVia` を決める `choice` が **ちょうど 1 つ**。その全選択肢に `metVia` が付いている |
| 任意 | `B2 named` を立てる `choice`（呼び名を選ぶ）。`free` 1 個まで（3 ビート目以降） |
| 完了 | `end` に到達したとき、サーバーが `B1` と `metVia` を確定し `beat = null` |
| 再開 | `beat != null` なら次回開いた時にそのビートから |
| 上限 429 | `free` で詰まった場合、翌日その `free` から。`line` / `choice` / `end` は上限に関係なく進む |
| ゲート拒否 | `free` で性的・安全ゲートに当たったら拒否文が返り、`beat` は据え置き |
| 台本が無い | `metVia: "default"` で即 `B1`。台本追加はキャラごとに段階的 |
| 既存ユーザー | `metVia: "legacy"` で即 `B1`。生の帯以下の入口フラグも立てる |
| 所要 | 3〜6 タップ、1 分以内。通消費 0〜1 |

### Ch0 の骨組み（キャラ共通の型）

台本本文はキャラごとに違うが、ビートの並びは次の型に収める。Gemini はこの型に本文を入れる。

```
entry  line    その場所にいる。相手（プレイヤー）に気づく。1〜2文。
b1     choice  どう声をかける／かけられるか。2〜3択。各選択肢に metVia。
b2*    line    選んだ metVia ごとの返し。reveals は 0〜1。
b3     choice  呼び名 or 一つだけ聞く。任意。B2 を立てる選択肢があってよい。
b4     free    任意。「で、あなたは？」系。promptHint に「初対面。名前はまだ知らない」等。
end    end     また会う含意の締め。hook を 1 本。
```

### Ch0 のキャラ別パラメータ

| characterId | 既定場面（`situationId`） | metVia の候補（例。本文は Gemini） |
| --- | --- | --- |
| `hiyori` | `cafe-rain` | `seat`（相席を頼んだ）／ `umbrella`（傘を貸した）／ `order`（同じものを頼んだ） |
| `rione` | `office-after` | `overtime`（残業で残っていた）／ `wrong-floor`（階を間違えた）／ `coffee`（給湯室で鉢合わせ） |
| `shiraishi` | `rooftop-night` | `stars`（同じ方を見ていた）／ `door`（屋上の扉を開けてもらった）／ `notebook`（落とし物を拾った） |
| `clara` | `penthouse-dusk` | `invitation`（招待の席で）／ `terrace`（テラスに出たら先にいた）／ `glass`（グラスを取り違えた） |

候補 id は台本側で変えてよい。**Ch0 では衣装場面を使わない。**

## 3. Ch1〜Ch3 のクリア条件（骨組み）

| 章 | 入口の吹き出し（型） | 選択肢（型） | 断り |
| --- | --- | --- | --- |
| Ch1 顔なじみ | 「また来てくれた」を数字なしで。metVia に一度触れてよい | 「また来る」の言い方 2〜3 通り。全部 `B3`。呼び名がまだなら `B2` を立てる選択肢を 1 つ混ぜてよい | なし |
| Ch2 告白 | キャラ側から言う。口調はキャラの `tone` に従う（ツンデレは遠回し、クールは短い）。metVia に触れてよい | 「受ける」（`B4`）／「まだ待って」（`defer`） | あり。`deferredUntil = count + 5`。再提示の吹き出しは `entry` ではなく `retry` ビート |
| Ch3 絆 | 二人の夜の短い場面。**NSFW 表現は入れない**（台本は共通） | 2 択。全部 `B5`。分岐は口調だけ | なし |

## 4. 章と無関係な進行

| 事象 | 何が起きるか | 章か |
| --- | --- | --- |
| 放置からの戻り（daysAway 2+） | `composeOpening` の `absence`、プロンプト【温度】。フラグ・帯は不変 | いいえ |
| ハロウィン季節 | `season: halloween` の場面が `B1` ＋ minLevel を満たせば `B3` 無しで開く | いいえ |
| 呼び名が記憶に入った | `B2 named` が導出で立つ | いいえ |
| 連続来訪（streak 3 / 7） | 開幕台詞と【連続】行（既存） | いいえ |

## 5. バリデーション（台本を落とす条件）

`src/lib/story-script.ts`（新規）の `validateStoryScript` が起動時に検査する。落ちたら起動しない（`loadRoster` と同じ厳しさ）。

- `entry` が存在し、全ビートから `end` に到達できる。到達不能ビートは不可。
- `next` / `choices[].next` の参照先が存在する。
- Ch0: `metVia` を持つ `choice` がちょうど 1 つ。その全選択肢に `metVia`。`metViaLines` に全 `metVia` の行がある。
- Ch1: 全経路で `B3` が立つ。Ch2: `B4` を立てる経路と `defer` の経路が両方ある。Ch3: 全経路で `B5`。
- `free` は台本あたり 1 個まで。`entry` から 2 ビート以内に置かない。`promptHint` は 60 字以内。
- `choices[].reveals` は 1 要素まで。台本全体の `reveals` は 3 種以内。
- 禁止語（本文・promptHint・metViaLines）: 学校 / 教室 / 制服 / 高校 / 女子高生 / JK / 部活 / 登下校 / 先生 / 年齢の数字。`catalog.ts` の既存チェック（学生服・JK）と同じ語群を共有する。
- 下着・裸・性的な語は本文に入れない（`catalog.ts` の場面チェックと同じ語群）。
- 吹き出し 1 本は 2〜4 文、120 字以内。選択肢ラベルは 20 字以内。
- `situationId` がそのキャラの `situations` に存在し、`costume` / `season` を持たない。
