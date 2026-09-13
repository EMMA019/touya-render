# 出会いフロー 実装仕様（Ch0〜Ch3 共通の台本ランナー）

設計の根拠は [LOVEPLUS_ROMANCE_SLG.md](LOVEPLUS_ROMANCE_SLG.md)、章ごとの条件は [LOVEPLUS_CHAPTER_TABLE.md](LOVEPLUS_CHAPTER_TABLE.md)。この文書は **次の PR で手を動かすための仕様**。ファイル名・関数名・差し込み行はすべて現状の `main` を基準にしている。

台本本文（Gemini 担当）が未マージでも、§1 のスキーマと `shared/story/_template.json` で全部の PR は進められる。台本が無いキャラは `metVia: "default"` で Ch0 を即完了する。

## 0. 不変条件（テストで守る）

1. 許可されたユーザー送信 1 通につき LLM は 1 回。台本ランナーは LLM を呼ばない。
2. `line` / `choice` / `end` ビートは `consumeTurn` も `incrementAffinity` も呼ばない。`free` だけが通常の `/api/chat` を通る。
3. フラグ・`count` は減らない。`effectiveLevel` は単調非減少。
4. 遷移の正本はサーバー。クライアントが送るのは `choiceId` / `beatId` だけで、`flags` を直接書く API は無い。
5. `promptHint` と `metViaLines` はサーバー専用。`GET /api/characters` の公開形からは削る（聖書と同じ扱い）。
6. 台本 JSON は起動時に検証し、落ちたら起動しない。
7. `shared/story/` を Android やブラウザに同梱しない。公開分は API 経由。

## 1. データスキーマ

### 1.1 台本 `shared/story/{characterId}.json`

1 キャラ 1 ファイル。章は配列で持つ（Ch0 だけでもよい）。`_` 始まりは読まない（`_template.json`）。

```jsonc
{
  "characterId": "hiyori",
  "version": 1,
  "metViaLines": {                       // サーバー専用。【関係】行に入る 20〜40 字
    "seat": "雨の日のカフェで、相席を頼まれて知り合った",
    "umbrella": "雨のカフェの前で、傘を貸してもらって知り合った",
    "order": "雨のカフェで、同じものを頼んだのがきっかけで知り合った"
  },
  "reveals": {                           // サーバー専用。【すでに話したこと】に入る
    "job": "自分が大学生だと話した",
    "rain": "雨の音が好きだと話した"
  },
  "chapters": [
    {
      "id": "hiyori-ch0",
      "chapter": 0,
      "situationId": "cafe-rain",        // 背景。costume / season 無しの場面に限る
      "entry": "b0",
      "beats": [
        { "id": "b0", "kind": "line", "text": ["雨、強くなってきたね。", "席、ここしか空いてないみたい。"], "next": "b1" },
        {
          "id": "b1", "kind": "choice",
          "text": ["……あ、どうぞ。座る？"],
          "choices": [
            { "id": "c-seat",     "label": "相席、いいですか",     "metVia": "seat",     "next": "b2-seat" },
            { "id": "c-umbrella", "label": "傘、貸します",         "metVia": "umbrella", "next": "b2-umbrella" },
            { "id": "c-order",    "label": "同じの、頼んでもいい？", "metVia": "order",    "next": "b2-order" }
          ]
        },
        { "id": "b2-seat", "kind": "line", "text": ["ありがと。雨の日は、ここが一番静かなの。"], "reveals": ["rain"], "next": "b3" },
        { "id": "b2-umbrella", "kind": "line", "text": ["……いいの？　じゃあ、少しだけ。"], "next": "b3" },
        { "id": "b2-order", "kind": "line", "text": ["ふふ、真似っこ。温かいの、おいしいよ。"], "next": "b3" },
        {
          "id": "b3", "kind": "choice",
          "text": ["名前、聞いてもいい？　ひよりって呼んで。"],
          "choices": [
            { "id": "c-name-say",  "label": "名前を言う",         "next": "b4", "setFlags": ["B2"], "userText": "（名前を伝える）" },
            { "id": "c-name-later", "label": "今日はまだいいかな", "next": "b4" }
          ]
        },
        {
          "id": "b4", "kind": "free",
          "text": ["じゃあ、ひとつだけ。今日は、どうしてここに？"],
          "promptHint": "初対面。相手は今日カフェに来た理由を話す。名前はまだ知らないかもしれない。2〜3文で受けて、聞き返しは一つ。",
          "next": "end"
        },
        { "id": "end", "kind": "end", "text": ["雨、まだやまないね。", "明日も、この席あけておく。"], "hook": "雨の日の席、あけておくって言った。", "setFlags": ["B1"] }
      ]
    }
  ]
}
```

型（`src/lib/story-types.ts`）:

```ts
export type StoryFlag = "B1" | "B2" | "B3" | "B4" | "B5";
export type BeatKind = "line" | "choice" | "free" | "end" | "defer" | "retry";

export type StoryChoice = {
  id: string;
  label: string;              // ボタン文言。20 字以内
  next: string;               // 遷移先 beat id
  metVia?: string;            // Ch0 の 1 つの choice だけに付く
  setFlags?: StoryFlag[];
  reveals?: string[];         // 1 要素まで
  remember?: string;          // 付いていれば relationship 種別の記憶として保存（規則のみ）
  userText?: string;          // 履歴に入れる user 吹き出し。無ければ label
  defer?: boolean;            // Ch2 の「まだ待って」。next は defer ビート
};

export type StoryBeat = {
  id: string;
  kind: BeatKind;
  text: string[];             // 吹き出し。1 要素 = 1 バブル。1〜2 要素
  next?: string;              // line / free / retry で必須
  choices?: StoryChoice[];    // choice で必須（2〜3）
  reveals?: string[];         // line に付けてよい。1 要素まで
  setFlags?: StoryFlag[];     // end / line に付けてよい
  promptHint?: string;        // free 専用。サーバー専用。60 字以内
  hook?: string;              // end 専用。クライアントの saveHook に渡す
};

export type StoryChapter = {
  id: string;                 // `${characterId}-ch${chapter}`
  chapter: 0 | 1 | 2 | 3;
  situationId: string;
  entry: string;
  beats: StoryBeat[];
};

export type StoryScript = {
  characterId: string;
  version: number;
  metViaLines: Record<string, string>;
  reveals: Record<string, string>;
  chapters: StoryChapter[];
};
```

公開形（`StoryScriptPublic`）は `promptHint` / `metViaLines` / `reveals`（辞書）を削ったもの。`text` / `label` / `hook` はクライアントが描くので公開。

### 1.2 進行状態 `data/story.json`

`createJsonStore` で `STORY_STORE_PATH` / `STORY_STORE_FILENAME`。キーは既存と同じ `${visitorId}:${characterId}`（ハッシュ済み訪問者 ID）。

```ts
export type StoryRecord = {
  scriptVersion: number | null;   // 進行中の台本版。台本無しなら null
  chapterId: string | null;       // 進行中の章。null = 章の外
  beat: string | null;            // 進行中のビート。null = 章の外
  flags: Partial<Record<StoryFlag, string>>;   // 立った時刻（ISO）
  metVia: string | null;          // "seat" | ... | "legacy" | "default"
  revealed: string[];
  choices: Record<string, string>;             // beatId -> choiceId（章 id 付き: `${chapterId}/${beatId}`）
  deferredUntil: number | null;   // Ch2 を断ったときの count
  legacy: boolean;
  today: { day: string; turns: number; warmth: "warm" | "cool" | "cold" };
  // 温度はその日の最初の接触（companion か chat）で bond.daysAway から確定して固定する。
  // 2 通目以降は daysAway が 0 になるので、ここに持たないと 1 通で解けてしまう。
};
```

`bond.json` は触らない（`daysMet` は開幕台詞のために残す）。

### 1.3 導出値（`src/lib/story.ts` 純関数）

```ts
export const ENTRY_FLAG: Record<0 | 1 | 2 | 3, StoryFlag> = { 0: "B1", 1: "B3", 2: "B4", 3: "B5" };
export const NSFW_MIN_LEVEL = 2;
export const DEFER_TURNS = 5;
export const THAW_TURNS = { warm: 0, cool: 2, cold: 4 } as const;

export function flagLevel(flags): -1 | 0 | 1 | 2 | 3;
export function effectiveLevel(count: number, flags): -1 | 0 | 1 | 2 | 3;   // min(rawLevel, flagLevel)
export function pendingChapter(count, record): 0 | 1 | 2 | 3 | null;        // rawLevel > effective かつ defer 中でない
export function warmthOf(daysAway: number): "warm" | "cool" | "cold";
export function isThawed(today: StoryRecord["today"]): boolean;                // turns >= THAW_TURNS[warmth]
export function rollToday(record, daysAway: number, day: string): StoryRecord;  // day が変わっていれば warmth 確定・turns 0
export function deriveNamed(record, memory: MemoryRow[]): boolean;          // B2 か memory に profile 種別
```

公開形（`StoryPublic`。`/api/companion` と SSE `story` イベントで返す）:

```ts
export type StoryPublic = {
  chapterId: string | null;
  beat: string | null;
  flags: StoryFlag[];
  metVia: string | null;
  effectiveLevel: number;       // -1..3
  effectiveName: string;        // 帯名。-1 は "はじめて"
  pendingChapter: number | null;
  warmth: "warm" | "cool" | "cold";
  nsfwEligible: boolean;        // effectiveLevel >= NSFW_MIN_LEVEL（年齢確認は含めない）
};
```

## 2. サーバー

### 2.1 新規モジュール

| ファイル | 役割 |
| --- | --- |
| `src/lib/story-types.ts` | §1 の型。クライアントからも import できる（server-only にしない） |
| `src/lib/story-script.ts` | `loadStoryScripts()`（`shared/story/*.json` を起動時に読む。`catalog.ts` と同じ形）、`validateStoryScript()`、`toPublicScript()`、`findBeat()` |
| `src/lib/story.ts` | JSON ストア、`readStory` / `startChapter` / `applyChoice` / `advanceFreeBeat` / `rollToday` / `bumpTodayTurns` / `migrateLegacy`、§1.3 の純関数 |
| `src/lib/story.test.ts` `story-script.test.ts` | 遷移・導出・バリデーション |

### 2.2 変更するモジュール

| ファイル | 変更 |
| --- | --- |
| `src/lib/situation-unlock.ts` | 署名を `isSituationUnlocked(scene, ctx: { flags, effectiveLevel, now })` に変える。`COSTUME_UNLOCK_DAYS` / `daysUntilUnlock` 削除。`unlockReason(scene, ctx): "open" \| "band" \| "chapter" \| "flag" \| "season"` と `LOCKED_HINT: Record<reason, string>` を追加 |
| `src/lib/character-types.ts` | `SituationPublic` に `requires?: StoryFlag[]` を追加。`toPublicSituation` で通す |
| `src/lib/catalog.ts` | `validateCharacter` に `requires` の値検査を追加（B1〜B5 のみ） |
| `src/lib/companion.ts` | `CompanionState` に `story: StoryPublic`、`script: StoryScriptPublic \| null`。`loadCompanion` で `migrateLegacy` → `readStory` → 解放判定を新署名で |
| `src/lib/prompt.ts` | `PromptContext` に `story` / `warmth` / `beatHint`。行の追加は本文 §6.3 のとおり |
| `src/lib/chat-mode.ts` | `NSFW_RELATIONSHIP_REQUIRED = "nsfw_relationship_required"`、文言「まだ、そこまでじゃない。」 |
| `src/lib/config.ts` | `STORY_STORE_FILENAME = "story.json"` |
| `src/lib/product-copy.ts` | 「通った日数が重なると…」の文を「話が進むと…」に直す（日数 grind の文言を消す） |

### 2.3 API

#### `GET /api/companion?characterId=`（拡張）

今の `{ bond, affinity, memory, unlocked }` に足す:

```jsonc
{
  "story": { /* StoryPublic */ },
  "script": { /* StoryScriptPublic | null。進行中 or 保留中の章だけ。無ければ null */ },
  "unlocked": ["cafe-rain"],
  "locks": { "maid": "flag", "miko": "band", "halloween-witch": "season" }
}
```

処理順: `readMemory` → `touchBond` → `readAffinity` → `migrateLegacy(record, affinity.count, bond.daysMet)` → `rollToday(record, bond.daysAway, today)` → 章の開始判定（`pendingChapter` があり `beat == null` なら `startChapter` = `enterBeat(entry)`）→ `unlocked` / `locks`。`touchBond` は `lastDay` を更新する前の `daysAway` を返すので、その値で温度を確定できる。

台本が無いキャラで `B1` が無ければ、ここで `metVia: "default"` を立てる。

#### `POST /api/story/choice`（新規）

```jsonc
// req
{ "characterId": "hiyori", "chapterId": "hiyori-ch0", "beatId": "b1", "choiceId": "c-seat" }
// res 200
{ "story": { /* StoryPublic */ }, "beat": { /* 次の StoryBeat 公開形。end なら kind: "end" */ }, "unlocked": [...], "locks": {...}, "memory": [ /* remember があれば追加分 */ ] }
// res 400
{ "error": "story_out_of_step" }   // beatId が現在の beat と違う。クライアントは companion を再取得
{ "error": "story_bad_choice" }    // choiceId が無い
{ "error": "unknown_character" }
```

副作用: `choices[chapterId/beatId] = choiceId`、選択肢の `setFlags` / `metVia` / `reveals` / `defer` を適用、`enterBeat(next)`。`remember` があれば `rememberFacts` に `{ kind: "relationship", text }` を渡す（規則抽出は通さない。文はそのまま）。

`enterBeat(beat)` は `story.ts` の 1 か所に置く: **ビートに入った時点で**（`startChapter` / `choice` / `advance` / `advanceFreeBeat` のどこから来ても）そのビートの `setFlags` / `reveals` を適用し `beat = beat.id`。`kind === "end"` なら適用後に `beat = null`、`chapterId = null`。`kind === "defer"` なら `deferredUntil = count + DEFER_TURNS` を書いて同じく章を閉じる。これで `line → line` や `entry` が `line` の場合も取りこぼさない。

LLM 呼び出し・`consumeTurn`・`incrementAffinity` は **しない**。レートリミットは `checkRateLimit` を通す（連打防止）。

#### `POST /api/story/advance`（新規・小）

`line` / `retry` ビートを次へ進める。req `{ characterId, chapterId, beatId }`。`beatId` が現在の `beat` と違えば 400 `story_out_of_step`、`kind` が `line` / `retry` 以外なら 400 `story_bad_beat`。処理は `enterBeat(next)` だけ。

（`line` をクライアント側だけで進めて `end` だけサーバーに投げる案もあるが、途中離脱の再開位置がずれるのでサーバーに寄せる。）

#### `POST /api/chat`（拡張）

`Body` に `beatId?: string`、`chapterId?: string` を足す。

```
resolveChatMode の直後:
  story = readStory(...); before = readAffinity(...)   // incrementAffinity より前の count で判定する
  if (chatMode === "nsfw" && effectiveLevel(before.count, story.flags) < NSFW_MIN_LEVEL)
      → 403 { error: "nsfw_relationship_required", message: "まだ、そこまでじゃない。", ...modePublic }

evaluateChatGate の直後（callModel === false のとき）:
  beat は据え置き。story は SSE で返す（変化なし）

consumeTurn / incrementAffinity の後:
  if (body.beatId):
      beat = findBeat(script, story.chapterId, body.beatId)
      if (!beat || beat.kind !== "free" || story.beat !== body.beatId) → beatHint 無し（黙って通常チャット扱い。400 にはしない）
      else beatHint = beat.promptHint
  story = rollToday(story, bond.daysAway, jstDayKey())
  warmth = { level: story.today.warmth, thawed: isThawed(story.today) }   // bump の前に判定（cool なら 2 通ぶん【温度】が出る）
  story = bumpTodayTurns(story)
  systemPrompt = buildSystemPrompt(..., { ..., story: promptStory(story, affinity.count, script), warmth, beatHint })

ストリーム完了後（replace / done の直前）:
  if (beatHint が使われた) advanceFreeBeat(story)   // enterBeat(beat.next)
  SSE: { type: "story", ...StoryPublic }（1 回。進んだ後の beat を返す）
```

ゲートで止まった経路（`callModel === false`）では `story` を変更せず、既存の `affinity` イベントの直後にそのまま返す。

`free` の返答本文を読んで何かを判定することはしない。

#### `POST /api/mode`（拡張）

`chatMode: "nsfw"` の要求時に同じ `NSFW_MIN_LEVEL` 判定を足す。年齢確認だけ先に済ませる（`confirmAge: true` のみ）のは今までどおり通す。

#### `GET /api/characters`（変更なし）

台本は入れない。ロスターの重さを増やさない。台本はチャットを開いた時に `/api/companion` で来る。

### 2.4 プロンプト（`buildSystemPrompt`）

追加行と順序は本文 §6.3。実装上の注記:

- `【距離】${BOND_LINE[stage]}` は `context.story` が **無い** ときだけ出す。`story` があれば【関係】に置き換える（両方は出さない）。
- 【関係】の文面は `story.metViaLine` が無ければ「今は{effectiveName}。」だけ。`legacy` は「出会いの経緯には触れない。」を足す。
- 【親密度】の `affinityName` には **実効帯の名前** を渡す（`affinity.name` ではなく）。生の帯が先に上がっていても口調は実効帯。
- NSFW のときの【関係】には既存の「NSFWでは距離が近くなくても…乗ってよい」の後半を残す。
- `beatHint` は `【いま】${beatHint}` として **【今の場面】の直前**。台本側の 60 字制限をここでも `slice(0, 80)` で保険。

### 2.5 解放判定の新署名

```ts
export type UnlockContext = { flags: StoryFlag[]; effectiveLevel: number; pendingChapter: number | null; now?: Date };

export function isSituationUnlocked(scene, ctx): boolean;
export function unlockReason(scene, ctx): "open" | "band" | "chapter" | "flag" | "season";
export function unlockedSituationIds(situations, ctx): string[];
export const LOCKED_HINT = {
  band: "もう少し話そう",
  chapter: "続きを見てから",
  flag: "もう少し話そう",
  season: "今は季節じゃない",
} as const;
```

`isHalloweenSeason` は残す。`defaultRequires(scene) = scene.costume ? ["B3"] : []`。季節中は `requires` を免除、`B1` と `minLevel` は免除しない。

`src/app/c/[slug]/page.tsx` の `initialUnlocked={unlockedSituationIds(character.situations, 0)}` は `unlockedSituationIds(character.situations, { flags: ["B1"], effectiveLevel: 0, pendingChapter: null })` に変える。SSR は今と同じく既定場面（衣装なし・minLevel 0）だけを楽観的に開けておき、正は `/api/companion` の `unlocked` で上書きする。`stranger` でも既定場面が見えているのは Ch0 の背景がその場面だから問題ない。

## 3. Web（Next.js）差し込み点

対象は `src/components/chat-view.tsx`。

| 場所 | 今 | 変更 |
| --- | --- | --- |
| 初期 state | `composeOpening` で `messages` を作る（L61〜74） | `story` / `script` state を追加（初期 `null`）。`messages` の初期化は今のまま（SSR は挨拶を出す。`/api/companion` が返るまでの数百 ms の骨組み） |
| ハイドレーション `useEffect`（L105〜134） | 保存済み履歴と `composeOpening` を合成 | 変更なし。章の有無はまだ分からないので今のまま動かす |
| `/api/companion` 取得 `useEffect`（L144〜160） | `bond` / `memory` / `unlocked` / `affinity` を set | `story` / `script` / `locks` も set。`story.beat != null` なら: (1) `messages` から id `greeting` と `welcome-*` の吹き出しを **取り除く**（保存済みの通常履歴は残す）、(2) `StoryRunner` をアクティブにして現在ビートの吹き出しを積む。`story.beat == null` なら今までどおり |
| `unlocked` 再計算 `useEffect`（L140〜142） | `unlockedSituationIds(..., bond.daysMet, ..., affinity.level)` | サーバーの `unlocked` を正とし、この effect は削除（`Unlock.kt` と同じく端末側計算はフォールバックだけ） |
| コンポーザー | 常に表示 | `story.beat != null && currentBeat.kind !== "free"` のとき非表示、代わりに `StoryRunner` の選択肢／「つづける」ボタン |
| 送信 `send()`（L181〜、body は L217） | body `{ characterId, situationId, messages, mode }` | `currentBeat?.kind === "free"` なら `beatId` / `chapterId` を足す。SSE の `story` イベントで `setStory` |
| 場面棚（L456〜、ロック文言は L475） | `Lock` ＋ `LOCKED_SITUATION_HINT` | `locks[scene.id]` に応じた `LOCKED_HINT[reason]`。日数表示は消す |
| `ModeToggle` | 年齢確認だけ | `story.nsfwEligible === false` なら鍵印。押すと「まだ、そこまでじゃない。」を出し、`/api/mode` は呼ばない |
| `AffinityHeart` | count / progress | `story.effectiveName` を表示。`pendingChapter != null` なら小さな印 |

新規コンポーネント `src/components/story-runner.tsx`:

- props: `character`, `script`, `story`, `situationId`, `onStory(next: StoryPublic, beat: StoryBeat | null)`, `onBubble(msgs: UiMessage[])`
- 現在ビートの `text[]` を `role: assistant`、id `story-{chapterId}-{beatId}-{i}` で `messages` に積む（`seedSituationGreeting` と同じ「同 id は二重に積まない」規則）
- `line` / `retry`: 「つづける」→ `POST /api/story/advance`
- `choice`: ボタン列 → `POST /api/story/choice`。成功したら `role: user` で `userText ?? label`（id `choice-{chapterId}-{beatId}`）を積み、返ってきた `beat` を描く
- `free`: 吹き出しを積んで通常コンポーザーを出す。`ChatView.send` に任せる
- `end`: 吹き出しを積み、`hook` があれば `saveHook(character.id, hook)`。`onStory` で `beat: null` を受けたらランナーを閉じる
- `story_out_of_step` を受けたら `/api/companion` を再取得して描き直す
- 章の背景場面: ランナー開始時に `setSituationId(chapter.situationId)`（`seedSituationGreeting` は呼ばない。場面の挨拶は台本が代わりに出す）

`src/lib/chat-history.ts` は変えない。章の吹き出しも通常どおり `saveChat` に入る。

## 4. Android（Compose）差し込み点

| ファイル | 変更 |
| --- | --- |
| `data/ApiModels.kt` | `StoryPublic`, `StoryBeat`, `StoryChoice`, `StoryChapterPublic`, `StoryScriptPublic` を追加。`CompanionSnapshot` に `story`, `script`, `locks: Map<String, String>` |
| `data/TouyaClient.kt` | `storyChoice(characterId, chapterId, beatId, choiceId): StoryChoiceResponse`、`storyAdvance(...)`。`chat(...)` の body に `beatId` / `chapterId`。SSE `story` イベントのパース |
| `TouyaViewModel.kt` `open()`（L111〜173） | `client.companion()` の後: `companion.story.beat != null` なら `composeOpening` を呼ばず、`situationId = chapter.situationId`、`messages = saved`（末尾に `welcome` を足さない）、`UiState.story` / `script` を set。`unlocked` は **サーバー値を正**、端末計算はフォールバック |
| `TouyaViewModel.kt` 新規 | `storyChoose(choiceId)`, `storyAdvance()`, `private fun applyStoryResponse(...)`（吹き出し積み・`saveHook`・`story` 更新） |
| `TouyaViewModel.kt` `send()`（L225〜） | 現在ビートが `free` なら `beatId` / `chapterId` を渡す。SSE `story` で `UiState.story` 更新 |
| `TouyaViewModel.kt` `requestNsfw()` / `toggleMode()` | `story.nsfwEligible == false` なら年齢ゲートを開かず `error = "まだ、そこまでじゃない。"` |
| `ui/ChatScreen.kt` | `state.story?.beat != null && beat.kind != "free"` のときコンポーザーの代わりに `StoryChoiceRow`（選択肢 / つづける）。場面棚のロック文言を `locks[id]` から。`ModeChip` に鍵 |
| `ui/AffinityHeart.kt` | `effectiveName` と `pendingChapter` の印 |
| `domain/Unlock.kt` | `COSTUME_UNLOCK_DAYS` / `daysUntilUnlock` 削除。`isSituationUnlocked(scene, flags, effectiveLevel, now)` に揃える。`LOCKED_HINT` の 4 種 |
| `data/ChatStore.kt` | 変更なし（章の吹き出しも通常の履歴として保存） |

Android は判定を持たない方針（`README.md`「Android は安全判定を持ちません」）はそのまま。`Unlock.kt` は表示のフォールバックで、正はサーバーの `unlocked` / `locks`。

## 5. バリデーション（`validateStoryScript`）

[LOVEPLUS_CHAPTER_TABLE.md §5](LOVEPLUS_CHAPTER_TABLE.md#5-バリデーション台本を落とす条件) の項目をそのまま実装する。禁止語群は `catalog.ts` から `export const BANNED_SCHOOL_WORDS` / `BANNED_NSFW_WORDS` に括り出して両方で使う。

追加で `_template.json` と実台本を **テストで実際に読む**（`story-script.test.ts`）。`shared/story/*.json` が 1 つでも落ちたらテスト失敗。

## 6. MVP タスク分割（PR 単位）

依存の向きは上から下。PR1〜3 は台本本文が無くても `_template.json` で完結する。

| PR | 内容 | 触るもの | テスト | 動作の変化 |
| --- | --- | --- | --- | --- |
| **PR1** 台本スキーマとローダー | `story-types.ts`, `story-script.ts`（load / validate / toPublic / findBeat）, `shared/story/_template.json`, `shared/story/README.md`, `catalog.ts` の禁止語括り出し | `story-script.test.ts`: 到達可能性、`metVia` ちょうど 1 つ、`free` 位置、禁止語、テンプレートが通る | なし（読むだけ。どのルートも参照しない） |
| **PR2** 進行ストアと導出、解放の帯＋フラグ化 | `story.ts`（ストア・純関数・`migrateLegacy`）, `situation-unlock.ts` 新署名, `character-types.ts` の `requires`, `companion.ts`, `/api/companion` 拡張, `page.tsx` の `initialUnlocked`, `Unlock.kt` 同期, `product-copy.ts` 文言 | `story.test.ts`: `effectiveLevel` 単調性、`pendingChapter`、`defer`、legacy 移行で開いていたものが閉じない。`situation-unlock.test.ts` を新署名で書き直し（`daysMet` のケース削除） | 衣装場面が「3 日」でなく B3 で開く。既存ユーザーは legacy 移行で現状維持。**台本が無いので Ch0 は `default` で即完了**、画面は今と同じ |
| **PR3** チャット経路の統合 | `/api/chat` の `beatId` / `story` SSE / `advanceFreeBeat` / `rollToday` + `bumpTodayTurns`、`prompt.ts` の【関係】【すでに話したこと】【温度】【いま】、`NSFW_MIN_LEVEL` ゲート（`/api/chat`, `/api/mode`）, `chat-mode.ts` の定数 | `prompt.test.ts`: 行の有無と順序、【距離】と【関係】の排他、legacy 文。`chat-gate` 系: ゲート拒否で beat が進まない。route のユニット（既存の形に合わせる）: NSFW 403 の新理由 | プロンプトに関係行が入る。**NSFW が特別未到達で 403 になる**（挙動変更。リリースノートに書く） |
| **PR4** `/api/story/*` と Web ランナー | `api/story/choice/route.ts`, `api/story/advance/route.ts`, `story-runner.tsx`, `chat-view.tsx` 差し込み（§3）, 場面棚のロック文言, `ModeToggle` 鍵, `AffinityHeart` | route ユニット: `out_of_step`、`bad_choice`、`end` で `beat = null`、`remember` が記憶に入る。ランナーは `seedSituationGreeting` と同じ純関数部分を切り出してテスト | 台本があるキャラで Ch0 が動く（この時点では `_template` 相当のダミー台本を `hiyori` に置いて手で確認し、マージ前に消す） |
| **PR5** Android ランナー | §4 の一式 | `Unlock.kt` の Kotlin テスト（既存があれば同じ場所）。ViewModel は `open()` の分岐を手で確認 | Web と同じ |
| **PR6** 台本本文（Gemini） | `shared/story/hiyori.json` を先頭に、4 人分。`characters/*.json` の `situations[].requires` 明示（必要なら） | PR1 のバリデーションが通ること | Ch0 が本番で流れる |
| **PR7** Ch1〜Ch3 台本と `retry` / `defer` の UI 確認 | 台本追加。コードは PR4 で入っている | `defer` → 5 通後に `pendingChapter` 再出現 | 章が全部つながる |

PR2 と PR3 の間で `main` をデプロイしても壊れない（Ch0 は `default` 完了、NSFW ゲートはまだ年齢のみ）。PR3 で NSFW の挙動が変わるので、PR3 は PR4 と同じリリースにまとめるか、`NSFW_MIN_LEVEL` を環境変数で一時的に `0` にできるようにしておく（`TOUYA_NSFW_MIN_LEVEL`、未設定なら 2）。

## 7. 手動確認シナリオ（PR4 / PR5 のレビュー用）

1. 新規訪問者で `hiyori` を開く → 挨拶ではなく `b0` の吹き出し。コンポーザーが無い。
2. `b1` で選択 → user 吹き出しが 1 つ、`b2-*` が出る。`data/story.json` に `metVia`。
3. アプリを閉じて開く → `b2-*` から再開。二重に吹き出しが出ない。
4. `b4`（free）で送信 → 通常返答、残通数が 1 減る、SSE に `story` イベント、`beat` が `end` に進む。
5. `end` → `B1`、コンポーザー復帰、翌日の開幕に `hook` が出る。
6. 場面棚: `maid` が鍵「もう少し話そう」。`count` を 10 にする（`debugUnlimited` で送るか `data/affinity.json` を直接）→ 開いた直後に Ch1 が流れ、終わると `maid` が開く。
7. `count` 30 で Ch2。「まだ待って」→ 仲良しのまま、`maid` は開いたまま、NSFW トグルは鍵。5 通後に `retry`。「受ける」→ NSFW トグルが押せる（年齢確認は別）。
8. `data/bond.json` の `lastDay` を 8 日前にする → 開幕が `absences.week`、最初の 4 通のプロンプトに【温度】、5 通目から消える。場面・フラグ・NSFW は変わらない。
9. 既存ユーザー（story 無し、count 35）を開く → Ch0 は出ない、`metVia: legacy`、`B1/B3/B4` が立ち、開いていた場面は全部開いたまま。
10. 性的な送信を `b4` で送る（SFW）→ 定型拒否、`beat` は `b4` のまま。

## 8. 決めていないこと（実装者が判断してよい）

- `line` ビートの自動送り（タップ不要で 1.2 秒後に次）を入れるか。入れる場合も `advance` はサーバーに投げる。
- `StoryRunner` の選択肢を吹き出し内に置くか、コンポーザー位置に置くか。Android は `SuggestionChip` の列を流用するのが早い。
- `pendingChapter` を「開いた瞬間」に流すか「次の送信の返答直後」に流すか。前者が単純。後者は返答の途中で画面が変わるので避けたい。**推奨: 開いた瞬間**。同一セッション中に閾値を跨いだら、ハートに印だけ出して次に開いた時に流す。
