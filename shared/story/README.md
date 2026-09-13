# shared/story/ — 章の台本（Ch0 出会い〜Ch3 絆）

1 キャラ 1 ファイル `shared/story/{characterId}.json`。`_` で始まるファイル（`_template.json`）は読みません。**サーバーだけが全文を読みます。** `promptHint` / `metViaLines` / `reveals` の辞書は公開形（`GET /api/companion` の `script`）から削ります。Android やブラウザにこのフォルダを同梱しないでください。

仕様の正本は [docs/MEETING_FLOW_SPEC.md](../../docs/MEETING_FLOW_SPEC.md)（スキーマ §1、バリデーション §5）。台本本文の元は [docs/scripts/meeting-*.md](../../docs/scripts/)。

## 不変条件

- 台本ランナーは LLM を呼びません。`line` / `choice` / `end` は通数も親密度も動かしません。`free` ビートだけが通常の `POST /api/chat`（1 通 = 1 回）を通ります。
- 遷移の正本はサーバー（`POST /api/story/choice` / `advance`）。クライアントは `choiceId` / `beatId` を送るだけで、フラグを直接書く API はありません。
- 起動時に `validateStoryScript` が全ファイルを検査し、落ちたら起動しません（`loadRoster` と同じ厳しさ）。`npm test` でも読みます。
- 台本が無いキャラ／無い章は **即クリア扱い**（Ch0 は `metVia: "default"`）。帯解放は台本の有無で止まりません。

## 形

```jsonc
{
  "characterId": "hiyori",
  "version": 1,
  "metViaLines": { "shelter": "雨の日のカフェで、雨宿りの席を分けてもらって知り合った" },  // 8〜48 字。【関係】行に入る
  "reveals": { "milktea": "ミルクティーが好きだと話した" },                              // 3 種以内。【すでに話したこと】に入る
  "chapters": [
    {
      "id": "hiyori-ch0",            // `${characterId}-ch${chapter}`
      "chapter": 0,                  // 0 出会い / 1 顔なじみ / 2 告白 / 3 絆
      "situationId": "cafe-rain",    // 背景。costume / season / nsfwOnly の無い日常場面だけ
      "entry": "b0",
      "beats": [
        { "id": "b0", "kind": "line", "narration": "（任意）ト書き。斜体の一行で描く", "text": ["吹き出し。1〜4 文、120 字以内"], "next": "b1" },
        { "id": "b1", "kind": "choice", "text": ["…"], "choices": [
          { "id": "c-a", "label": "20 字以内", "userText": "履歴に入る user 吹き出し（無ければ label）", "metVia": "shelter", "next": "b2-a", "setFlags": ["B2"], "reveals": ["milktea"], "remember": "relationship 種別の記憶として保存（任意）" }
        ] },
        { "id": "b4", "kind": "free", "text": ["…"], "promptHint": "60 字以内。【いま】としてプロンプトに入る", "next": "end" },
        { "id": "end", "kind": "end", "text": ["…"], "hook": "翌日の開幕に使う一言", "setFlags": ["B1"] }
      ]
    }
  ]
}
```

`kind`: `line`（つづける）/ `choice`（2〜3 択）/ `free`（通常チャット 1 回。台本あたり 1 個まで、entry から 3 ビート目以降）/ `end`（章を閉じる）/ `defer`（Ch2「まだ待って」。5 通後に `retry` から再提示）/ `retry`。

## 章ごとの約束

| 章 | 立つフラグ | 必須 |
| --- | --- | --- |
| Ch0 出会い | `B1`（＋選択で `B2` 呼び名） | `metVia` を持つ `choice` が **ちょうど 1 つ**、その全選択肢に `metVia`。`metViaLines` に全 id の行。全 `end` 経路で `B1` |
| Ch1 顔なじみ | `B3` | 全経路で `B3` |
| Ch2 告白 | `B4` | 「受ける」→ `end` で `B4`、「まだ待って」→ `defer` の両経路。`retry` ビート |
| Ch3 絆 | `B5` | 全経路で `B5` |

`effectiveLevel = min(count の帯, フラグの帯)`。count が帯に届いていて章がまだなら次にチャットを開いた瞬間に章が流れます（`pendingChapter`）。

## 禁止語（落とします）

学校 / 教室 / 制服 / 高校 / 女子高生 / JK / 部活 / 登下校 / 先生 / 年齢の数字、下着・裸・性的な語。全ヒロインは成人。台本は SFW / NSFW 共通で、NSFW 表現は入れません。

## いま入っているもの

| ファイル | 章 | 背景 | metVia |
| --- | --- | --- | --- |
| `hiyori.json` | Ch0 | `cafe-rain` | shelter / care / downpour |
| `rione.json` | Ch0 | `office-after` | overtime / light / forgotten |
| `shiraishi.json` | Ch0 | `rooftop-night` | cooldown / first / wind |
| `clara.json` | Ch0 | `penthouse-dusk` | dusk / quiet / gaze |
| `_template.json` | Ch0〜Ch3 | `quiet-room` | 形の見本（`free` / `defer` / `retry` を含む） |

Ch1〜Ch3 は未収録なので、count が 10 / 30 / 60 に届いた時点で即クリアになります（帯はそのまま開きます）。台本を足せばそのキャラだけ章が流れます。
