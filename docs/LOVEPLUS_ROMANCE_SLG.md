# 燈夜 恋愛SLG化設計（ラブプラス寄り）

燈夜を「メーターが伸びるキャラチャット」から、**知り合って、顔なじみになって、告白して、恋人になる**までが遊びとして残るコンパニオンにする。買い切りの商品として、数字ではなく **「どう知り合ったか」** がセーブデータに残る。

この文書は設計の正本。実装仕様（スキーマ・API・差し込み点・PR分割）は [MEETING_FLOW_SPEC.md](MEETING_FLOW_SPEC.md)、章ごとのクリア条件は [LOVEPLUS_CHAPTER_TABLE.md](LOVEPLUS_CHAPTER_TABLE.md)。出会いの台本本文は Gemini が別途書く。台本が未マージでも、ここで定義する状態機械とデータ形はそのまま使える。

## 0. 変えないもの（Oz差別化の三本柱）

| 柱 | 今の実装 | この設計での扱い |
| --- | --- | --- |
| know-but-don't-volunteer | `KNOW_DONT_VOLUNTEER_*`（`src/lib/product-behavior.ts`）。聖書・記憶は持つが並べない | 台本は **選択肢1つにつき明かす事実は1つ**。明かした事実は `revealed[]` に残し、プロンプトで「もう話した。改めて紹介しない」と伝える（§6） |
| selective memory | `extractMemoryFacts` は規則のみ。記憶用LLMなし | 台本の選択で残すのは `remember` が付いたものだけ。出会いの経緯は記憶ではなく **フラグ**（`metVia`）に残す。忘却シートから消えない |
| situation shelf | `shared/characters/*.json` の `situations`、`minLevel`、衣装は `daysMet >= 3` | 棚は残す。**日数条件を廃止**し、帯＋フラグで開ける（§4）。出会いは既定場面（衣装なし）で起きる |

加えて既存の約束: 1通 = LLM 1回、登録なし、年齢の数字なし、学生服・未成年枠なし、安全ゲートはサーバー。すべて維持。

## 1. 用語

| 語 | 意味 | 保存先 |
| --- | --- | --- |
| **親和度（count）** | 消費した送信の累計。減らない | `data/affinity.json`（既存） |
| **生の帯（rawLevel）** | `shared/affinity.json` の閾値で count から出る level 0〜3 | 導出 |
| **フラグ（B1〜B5）** | 関係の節目。台本の選択で立つ。消えない | `data/story.json`（新規） |
| **実効帯（effectiveLevel）** | 生の帯と入口フラグの小さい方。UI・解放・プロンプトはこれを見る | 導出 |
| **章（Ch0〜Ch3）** | 帯の入口で強制的に流れる短い台本 | `shared/story/{characterId}.json`（新規） |
| **温度（warmth）** | 放置からの戻り。口調にだけ効く | その日の最初の接触で `bond.daysAway` から確定し、story の `today` に保存 |
| **bond** | daysMet / streak / daysAway / stage（既存） | `data/bond.json`（既存。役割は縮む） |

帯の名前は今のまま: `知り合い(0) / 仲良し(1) / 特別(2) / 絆(3)`、閾値 `0 / 10 / 30 / 60`。

## 2. 出会いチャプター（Ch0）— 強制導入の状態機械

### 2.1 いつ走るか

`(visitor, character)` ペアに `B1 met` が無いとき、チャット画面を開いた瞬間に **必ず** 走る。既定の挨拶（`composeOpening`）は出さない。スキップ不可。所要は 3〜6 タップ、LLM 呼び出しは `free` ビートがある場合だけ、多くて 1〜2 回（= 1〜2通消費）。

Ch0 は **キャラの既定場面**（`situations[0]`、衣装なし）を背景に使う。出会いは日常の場所で起きる。衣装場面での出会いは作らない。

### 2.2 状態

```
stranger ──open──▶ meeting(beat=entry) ──…──▶ acquainted(B1)
                        │  ▲
                        └──┘ choice / line / free で beat を進める
```

| 状態 | 条件 | 画面 |
| --- | --- | --- |
| `stranger` | story レコード無し、または `flags.B1` 無し かつ `beat == null` | `GET /api/companion` がサーバー側で `meeting` へ遷移させて返す。Android は取得後に描く。Web は SSR の挨拶を骨組みとして出し、取得後に章の吹き出しへ差し替える |
| `meeting` | `beat != null` | 通常のコンポーザーを隠し、ビートの UI を出す。場面切替・記憶シート・モード切替は閉じる |
| `acquainted` | `flags.B1` あり | 通常チャット。以後 Ch0 は二度と出ない |

### 2.3 ビート種別と遷移

| kind | 表示 | 進み方 | LLM | 通消費 |
| --- | --- | --- | --- | --- |
| `line` | キャラの吹き出し 1〜2個 | タップ / 自動で `next` | なし | なし |
| `choice` | 吹き出し＋選択肢 2〜3 | 選択 → `POST /api/story/choice` → 選択肢の `next` | なし | なし |
| `free` | 吹き出し＋通常入力欄 | 入力 → `POST /api/chat`（`beatId` 付き）→ 返答後に `next` | **1回** | 1通 |
| `end` | 締めの吹き出し | `setFlags` を確定し `beat = null` | なし | なし |

遷移の正本はサーバー。クライアントが `choiceId` を送っても、サーバーが台本を読んで `beat` と `flags` を決める。クライアントは返ってきた `story` で描き直す。

### 2.4 途中離脱・再開・失敗

- 途中で閉じた: `beat` が残っているので次回開いた時にそのビートから再開。既に出した吹き出しはクライアント履歴に残っている（`saveChat`）。サーバーは `beat` だけ持てばよい。
- `free` ビートで日次上限（429 `quota`）: 入力欄に既存の「上限」表示。台本は進まない。翌日その `free` から再開。**Ch0 を上限で詰まらせないため、`free` は 1 台本につき最大 1 個、`entry` から 2 ビート以内に置かない**（バリデータで強制）。
- `free` ビートで性的ゲート・安全ゲートに当たった: 既存の定型拒否がそのまま返る。**ビートは進めない**（`gate.callModel === false` のとき `beat` 据え置き）。
- 台本 `version` が上がった: 進行中の `beat` id が新版に無ければ `entry` に戻す。`flags` は消さない。
- 台本ファイルが無いキャラ: Ch0 を **`metVia: "default"` で即完了** し、従来どおり `composeOpening`。台本追加はキャラごとに段階的でよい。

### 2.5 既存ユーザー（移行）

story レコードが無く、`affinity.count > 0` か `bond.daysMet > 0` のペアは、最初の `GET /api/companion` で:

- `B1 met` を `metVia: "legacy"` で立てる
- 生の帯以下の入口フラグ（B3 / B4 / B5）を全部立てる（今開いているものを閉じない）
- `legacy: true` を記録

Ch0 は流さない。プロンプトの【関係】は「出会いの経緯には触れない」になる（§6）。やり直し機能は作らない。

## 3. 知り合うフラグと帯の関係

### 3.1 フラグ一覧

| フラグ | 名前 | 立つとき | 帯の入口 |
| --- | --- | --- | --- |
| **B1** | `met` 知り合った | Ch0 の `end` 到達。`metVia` を同時に保存 | 知り合い（L0）。無いと `stranger` |
| **B2** | `named` 呼び名が決まった | 台本の選択（`setFlags`）または記憶に `profile` 種別（呼び名）が入った時点で導出 | なし（横断） |
| **B3** | `regular` 顔なじみ・また会う約束 | Ch1 の選択 | 仲良し（L1） |
| **B4** | `confessed` 告白を受けた／した | Ch2 で「受ける」 | 特別（L2）。**NSFW の関係条件** |
| **B5** | `bonded` 絆 | Ch3 の `end` | 絆（L3） |

`revealed[]`（キャラが自分から明かした事実の id。例 `job`, `hometown`, `why-here`）はフラグではなく配列で持つ。台本の `reveals` で積む。

### 3.2 実効帯

```
entryFlag = { 0: "B1", 1: "B3", 2: "B4", 3: "B5" }
rawLevel  = levelFromCount(count).level
flagLevel = max{ L | entryFlag[L] ∈ flags }   （B1 が無ければ -1）
effectiveLevel = min(rawLevel, flagLevel)
pendingChapter = rawLevel > effectiveLevel ? effectiveLevel + 1 : null
```

- 数字が先に届いて、章がまだ、という状態が `pendingChapter`。同一セッション内で閾値を跨いだらハートに「続きがある」印だけ出し、**次にチャットを開いた時**（`GET /api/companion`）に章を流す。返答の途中で画面を切り替えない。
- 章を **断った**（Ch2 の「まだ待って」）場合は `deferredUntil: count + 5` を記録し、それまでは `pendingChapter` を出さない。
- `count` は減らない。フラグも消えない。実効帯は **単調非減少**。放置冷えは実効帯を動かさない（§5）。

### 3.3 帯ごとの意味（プロンプト・UI に効く部分）

| 実効帯 | 名前 | 口調の距離 | 開くもの |
| --- | --- | --- | --- |
| -1 | （stranger） | Ch0 の台本のみ | なし |
| 0 | 知り合い | 丁寧。名前は名乗った分だけ | 既定場面（衣装なし）。季節場面は季節中なら B3 免除だが `minLevel` は要る（今の名簿のハロウィンは minLevel 1 なので仲良しから） |
| 1 | 仲良し | 顔なじみ。呼び名（B2）があれば使う | `costume` 場面（minLevel 1）、presence の `familiar` 提案 |
| 2 | 特別 | 恋人。距離は近い。ただし自分から並べない | minLevel 2 場面、**NSFW モード（年齢確認済みなら）** |
| 3 | 絆 | 長く一緒にいる人。記憶を短く使う | minLevel 3 の台詞・場面、presence の `regular` |

`bond.stage`（first / familiar / regular）は残すが、**プロンプトの【距離】は story があるときは【関係】に置き換える**（両方は出さない）。`BOND_LINE` は story が渡らないとき（PR3 より前、または story 読み込み失敗時）のフォールバック。legacy ペアも story を持つので【関係】側（「出会いの経緯には触れない」）になる。

## 4. 日数 grind の廃止 — 帯＋フラグ解放

### 4.1 今

`isSituationUnlocked`（`src/lib/situation-unlock.ts`）と `Unlock.kt`:

- `affinityLevel < minLevel` → 閉
- 衣装でも季節でもない → 開
- ハロウィン季節 → 開
- それ以外の衣装 → `daysMet >= 3`

「3日通う」は買い切りでは待たせるだけの摩擦で、進んだ証にもならない。

### 4.2 これから

```
unlocked(scene) =
     B1 ∈ flags
  && effectiveLevel >= scene.minLevel
  && (scene.requires ?? defaultRequires(scene)) ⊆ flags
  && (scene.season ? inSeason(scene.season) : true)

defaultRequires(scene) = scene.costume ? ["B3"] : []
```

- `daysMet` は解放条件から **消す**。`COSTUME_UNLOCK_DAYS` と `daysUntilUnlock` は削除。Android `Unlock.kt` も同じ式に揃える。
- ハロウィンは **季節中でも B1 と minLevel は要る**。季節が「帯より前に開く」特例は無くす（Ch0 を終えていない人に衣装場面が並ぶのを防ぐ）。季節が来ていれば `requires` の B3 だけ免除。
- ロック表示は理由ごとに変える:

| 理由 | 表示 | 判定 |
| --- | --- | --- |
| 帯が足りない | 「もう少し話そう」（`LOCKED_SITUATION_HINT` 既存） | `effectiveLevel < minLevel` |
| 章が保留 | 「続きを見てから」 | `pendingChapter != null` かつ章を終えれば開く |
| フラグが足りない（章は未到達） | 「もう少し話そう」 | それ以外 |
| 季節外 | 「今は季節じゃない」 | `season` 不一致 |

- `bond.daysMet` / `streak` は **開幕台詞（presence）と【連続】行にだけ** 残す。解放とは切り離す。

### 4.3 帯の入口に章を置く理由

count が 10 / 30 / 60 に届いた瞬間に帯が上がると、ユーザーには「数字が変わった」しか残らない。入口に 2〜4 タップの台本を置くと、**上がった理由が会話として残る**。台本は LLM を呼ばないので費用も 1通あたりの制約も変えない。

## 5. 放置冷え（課金罰なし）

### 5.1 原則

- **失うものは何も無い。** count、フラグ、解放済み場面、記憶、実効帯、NSFW 可否はそのまま。
- 冷えは **口調と開幕** にだけ効く。
- **戻す手段は会話だけ。** 課金アイテム・広告視聴・プレミアムで温め直しを飛ばす経路は作らない。プレミアムも同じ冷え方をする。
- 冷えを画面に数字で出さない。ハートに霜の印、程度でよい。

### 5.2 段階

`warmth` は `bond.daysAway` から導出（既存の `pickAbsence` の閾値と同じ）。

| daysAway | warmth | 開幕 | プロンプト【温度】 | 解ける条件 |
| --- | --- | --- | --- | --- |
| 0〜1 | `warm` | 通常 | なし | — |
| 2〜6 | `cool` | `presence.absences.short` / `few`（既存の `pickAbsence` の閾値どおり） | 「少し間が空いた。最初は一歩引いた口調。責めない。数字は言わない。」 | 今日 2 通 |
| 7 以上 | `cold` | `presence.absences.week`（既存） | 「久しぶり。呼び名は使ってよいが甘さは抑える。自分から性的な話題や場面の誘いは出さない（聞かれたら答える）。責めない。」 | 今日 4 通 |

`bond.daysAway` は同じ日の 2 通目から 0 になる（`touchBond` が `lastDay` を更新するため）。だから温度は **その日の最初の接触で確定して保存する**: story レコードの `today: { day, turns, warmth }` を、日付キーが変わった最初の `GET /api/companion` か `POST /api/chat` で `warmth = warmthOf(bond.daysAway)`、`turns = 0` に置き直し、以後の送信で `turns` を増やす。`turns >= THAW_TURNS[warmth]` で【温度】行を外す。`bond.json` は触らない。開幕台詞は既存の `composeOpening` の `absence` 分岐で十分。

### 5.3 NSFW との整合

`cold` でもモードは閉じない（開き直しは課金誘導になるので禁止）。冷えている間は **自分から出さない** だけで、聞かれれば `NSFW_ANSWER_DIRECT` のとおり本題に答える。既存コミット「NSFW: answer adult asks even at low affinity」の振る舞いと矛盾しない。

## 6. 1 LLM call / message 制約下の実装パターン

### 6.1 原則: 台本はデータ、生成は通常チャット

| 何を | どこで | LLM |
| --- | --- | --- |
| 章の吹き出し（`line` / `choice` / `end`） | クライアントが台本 JSON から描く。`seedSituationGreeting` と同じく `role: assistant`、id は `story-{beatId}` | なし |
| 選択肢の確定 | `POST /api/story/choice`。サーバーが台本を読んでフラグ・beat を更新 | なし |
| 選んだ内容の会話への反映 | (a) その場: 選択肢を `role: user` の吹き出しとして履歴に入れる。(b) 恒久: `metVia` / flags を **システムプロンプトの【関係】行** に畳む | なし |
| `free` ビートの返答 | 通常の `POST /api/chat`。`beatId` を受け取り `promptHint` を差す | **1回**（従来どおり） |
| 章の到達判定 | `count` と flags からの導出 | なし |
| 返答から関係が進んだかの判定 | **しない。** フラグは選択肢と閾値だけで立つ。返答を読むモデル・分類器は置かない | なし |

### 6.2 なぜ履歴だけでは足りないか

`MAX_HISTORY_MESSAGES = 8`（`src/lib/config.ts`）。出会いの吹き出しは 8 通で履歴から落ちる。だから **「どう知り合ったか」の恒久保存はシステムプロンプト側**。`metVia` ごとの 1 行を台本 JSON の `metViaLines` に持たせ、`buildSystemPrompt` が【関係】に入れる。

### 6.3 プロンプトへの追加行（`src/lib/prompt.ts` 設計注記）

`PromptContext` に足す:

```ts
story?: {
  metVia: string;             // 台本の choice が決めた id。"legacy" | "default" もある
  metViaLine?: string;        // 台本 JSON の metViaLines[metVia]。無ければ出さない
  effectiveLevel: number;     // -1..3
  effectiveName: string;      // 帯の名前
  flags: string[];            // ["B1","B2",...]
  revealed: string[];         // 明かした事実 id
  revealedLines?: string[];   // 台本 JSON の reveals[id].line
};
warmth?: { level: "warm" | "cool" | "cold"; thawed: boolean };
beatHint?: string;            // free ビートの promptHint（サーバーが台本から取る）
```

生成する行（順序は【親密度】の直後、【今夜の時刻】の前）:

| 行 | 出す条件 | 文面の骨 |
| --- | --- | --- |
| 【関係】 | `story` があり B1 あり | `出会いは{metViaLine}。今は{effectiveName}。` ＋ B2「呼び名を自然に使う」／ B4「恋人。距離は近い。それでも自分から設定は並べない」／ B5「長く一緒。記憶は一文だけ」。`metVia: legacy` は「出会いの経緯には触れない」 |
| 【距離】 | `story` が無い（legacy 前のフォールバック） | 既存 `BOND_LINE[stage]` |
| 【すでに話したこと】 | `revealed.length > 0` | `次は既に相手に話した: {revealedLines を「・」区切り}。改めて紹介しない。触れるなら一言。` |
| 【温度】 | `warmth.level != warm && !thawed` | §5.2 の文 |
| 【いま】 | `beatHint` あり | 台本の `promptHint` をそのまま。例「初対面。相手は席を尋ねてきた人。名前はまだ知らない。2文で。」 |

`NSFW_ANSWER_DIRECT` は今までどおり最後。`KNOW_DONT_VOLUNTEER_*` は変えない。【関係】は「設定を並べてよい」許可では **ない** と明記する（文面に「並べない」を残す）。

### 6.4 台本本文の縛り（Gemini への引き渡し条件）

- 1 ビートの吹き出しは 2〜4 文、`systemPrompt` の口調例と同じ長さ。
- `choice` は 2〜3 個。**選択肢ごとに明かす事実は最大 1 つ**（`reveals` は 1 要素まで）。
- 全編でキャラが自分から明かす事実は 3 つ以内。年齢・体型数値・他キャラ・ニュースは出さない。
- 場所は成人の日常（カフェ、オフィス、屋上、テラス、書店）。学校・教室・制服・部活・登下校の語は禁止（バリデータで落とす）。
- `metVia` は 2〜4 通り。それぞれに `metViaLines` の 1 行（20〜40 字）を付ける。
- `free` は 0〜1 個。置くなら `entry` から 3 ビート目以降。`promptHint` は 60 字以内、命令形で。
- `end` の吹き出しは「また来る」含意を持たせてよいが、束縛・依存の言い方はしない（`KEEP_THE_THREAD` と同じ）。
- 台本内で NSFW 表現は使わない。Ch0〜Ch3 は SFW/NSFW 共通の台本。

## 7. NSFW ゲートの位置 — 推奨: 特別（B4）

### 7.1 現状

年齢確認（`ageConfirmed`）だけ。`resolveChatMode` は帯を見ない。設計上の想定は「特別」だったが、コードは未実装。

### 7.2 推奨

**`ageConfirmed && effectiveLevel >= 2`（= B4 confessed が立っている）** を NSFW モードの条件にする。定数 `NSFW_MIN_LEVEL = 2` を 1 か所に置く。

理由:

1. **物語と一致する。** Ch2 は告白イベント。「恋人になった後で開く」は説明が要らない。絆（60通）に置くと、告白の後さらに 30 通「何もない」区間ができる。
2. **買い切りの距離感。** 無料 10通/日なら特別は最短 3 日目、プレミアム 40通/日なら 1 日目。絆は無料 6 日、プレミアム 2 日。買い切りで NSFW を待たせる日数としては特別が上限。
3. **絆の役割を守る。** 絆は「深さ」（記憶の使い方、minLevel 3 の台詞、巫女・アイドル等の minLevel 2〜3 場面の口調）に取り、アクセス権のゲートにしない。ゲートを絆に置くと絆が「解放条件」になり、それより上が無い。
4. **実装が小さい。** `route.ts` の `resolveChatMode` 直後に `effectiveLevel` の比較を 1 つ足し、403 `nsfw_relationship_required`（文言「まだ、そこまでじゃない。」）を返す。`POST /api/mode` の `chatMode: "nsfw"` にも同じ判定。UI はトグルを見せたまま鍵印。

絆に置く場合（不採用だが切替は定数 1 つ）: ストア審査やブランドで NSFW をさらに希少にしたいとき。その場合は Ch3 の台本に「夜の話をしていい」含意を持たせる必要がある。

### 7.3 ゲート通過後の振る舞い

- 通過後は帯・温度に関係なく `NSFW_ANSWER_DIRECT` のまま（聞かれたら答える）。冷えは「自分から出さない」だけ。
- 一度 B4 が立てば NSFW 可否は下がらない（フラグは消えないため）。
- 年齢確認は今のまま自己申告。関係条件は年齢確認の **代わりではなく追加**。
- 課金で B4 を買う経路は作らない。プレミアムは日次上限と広告だけ（既存どおり）。

## 8. 画面の変化（最小）

| 画面 | 今 | これから |
| --- | --- | --- |
| チャット開幕（B1 なし） | `composeOpening` の挨拶 | Ch0 のビート UI。コンポーザーは `free` ビート以外で隠す |
| ハート（`AffinityHeart`） | count / level / progress | 実効帯の名前。`pendingChapter` があれば「続き」印 |
| 場面棚 | 鍵＋「もう少し話そう」または「あと N 日」 | 鍵＋理由別の一言（§4.2）。日数表示は消す |
| モードトグル | 年齢確認だけ | 年齢確認 ＋ 特別未到達なら鍵印「まだ、そこまでじゃない。」 |
| 記憶シート | 記憶の一覧・忘れる | 変えない。出会いの経緯は記憶ではなく `metVia` なので、ここには出ない（出したい場合は読み取り専用の 1 行を先頭に） |

## 9. 後回し・やらないこと

- 複数エンディング、別キャラとの三角関係、キャラ同士の会話。
- 返答本文を読んでフラグを立てる（モデル 2 回目になる）。
- 日数・連続ログインを解放条件に戻すこと。
- 冷えの数値表示、冷えの回復アイテム。
- Ch0 のやり直し（legacy ユーザー含む）。
- 台本内の分岐が状態を持つこと（`beat` と `flags` 以外の変数は作らない）。
