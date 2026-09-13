# 燈夜 × OzChat システムレビュー（2026-09-13）

対象: ブランチ `cursor/daily-loop-0477`（PR #10。Emma の Pixel ビルド元）+ 未マージ PR #4〜#14 の中身。
レビューのみ。製品コードは触っていない。ファイルパスはすべてこのリポジトリの実物。

Scope: the `cursor/daily-loop-0477` branch that Emma's phone is built from, read against the eleven open PRs. Review only; no product code touched.

---

## 0. Executive summary（10行）

1. **一番大きな穴は「機能が無い」ことではなく「機能が 11 本の未マージ PR に散っていて、電話に 1 本も届いていない」こと。** 親密度の上下（#9）・特別ゲート（#7）・トップバー（#4）・動画（#6）・贈り物（#11）・音声（#12）・個人用クリーンアップ（#14）は全部 `main` 起点で、`daily-loop-0477` の Pixel ビルドには入っていない。
2. **Emma の前提「NSFW はローカル Ollama Gemma」はコードに存在しない。** `src/lib/chat-backend.ts` は `deepseek | openrouter | demo` のみ。NSFW は今も OpenRouter（hermes-3 70B、クラウド）に飛ぶ。
3. **親密度がデプロイのたびに消える。** ストアは `data/*.json`（`src/lib/json-store.ts`）、Render は `plan: free`（`render.yaml`）でディスクが揮発、Android の既定 API は `https://touya.onrender.com`（`android/app/build.gradle.kts:18`）。恋愛シムで進捗がリセットされるのは致命傷。
4. **個人用フラグ `TOUYA_DEBUG_UNLIMITED=1` が戻りループを壊す。** 残通数 9999 → `saveHook` の条件 `remaining <= 1` が永久に偽（`TouyaViewModel.kt:340`、`chat-view.tsx:378`）→「昨日の続き」が二度と出ない。プロンプトの【終わり際】も同様に死ぬ。ヘッダーには「DEBUG」が常駐（`QuotaPill.kt:18`）。
5. **Oz との体感差の本体は動き。** 棚もチャットも `AsyncImage` の静止 PNG（`SituationCardShelf.kt:191`、`ChatScreen.kt:105`）。Ken Burns もクロスフェードも時刻トーンも無い。mp4 以前にコンポーズだけで埋められる差が 7 割ある。
6. **親密度は「+1 固定 / 名前だけプロンプト」。** `affinity.ts:53-65` は毎通 +1、`prompt.ts:101-107` は段階名を渡すだけ。返事の温度も節目も無く、ローカル無制限なら 1 晩で「特別」に届く（30 通）。
7. **「特別」に到達しても何も現れない。** `nsfwOnly` の場面は `shared/characters/*.json` に 0 件。棚の「特別な時間」ロック UI・API の秘匿処理は中身の無い箱。
8. **提案チップは固定 3 本。** `suggestionsFor()` は `presence.suggestionsByStage[bondStage]` を返すだけ（`presence.ts:97`）。直前の返答・場面・時刻・記憶を見ていない。
9. **進捗メーターが二重。** Bond（会った日数: 初対面/顔なじみ/常連、`bond-types.ts`）と Affinity（通数: 知り合い/仲良し/特別/絆、`shared/affinity.json`）がヘッダーに並び、プロンプトにも両方入り、チップは Bond、ゲートは Affinity を見る。ユーザーには 1 本に見せるべき。
10. **CI が無く、Android は誰もコンパイルしていない。** `.github/` 不在。PR #8/#13/#14 は自己申告で「Kotlin は未コンパイル」。Booth 以前に「電話でビルドが通る」保証をコードで持つのが先。

**EN one-liner:** Touya's prompt/gate/memory core is sound and already differentiated; what loses to OzChat is (a) an unmerged PR stack that never reached the phone, (b) no local NSFW backend despite the plan, (c) progression state on an ephemeral disk, (d) zero motion, (e) flat affinity with nothing behind the 特別 door. Fix integration and persistence first, then motion and affinity feel; leave Live2D, on-device LLM and Booth packaging alone until then.

---

## 1. 前提の確認（コードが実際に何であるか）

| Emma の意図 | リポジトリの現状 | 根拠 |
| --- | --- | --- |
| 個人利用ファースト、広告・枠なし・診断なし | この枝には全部残っている: 診断画面・プレミアム画面・AdMob スタブ・「広告なしで話す」 | `MainActivity.kt:102-108`, `SituationCardShelf.kt:157-164`, `ChatScreen.kt:245-277`, `home-portal.tsx:64-73` |
| NSFW はローカル Ollama Gemma | Ollama / Gemma への参照はゼロ。NSFW = OpenRouter 必須、無ければ 503 | `chat-backend.ts:19-22`, `config.ts:23` |
| 恋愛シム: 特別（level≥2）まで NSFW ロック | この枝の `resolveChatMode` は年齢確認だけ見る。親密度ゲートは PR #7（Draft、main 起点）にしか無い | `chat-mode.ts:35-52` |
| Android: 名前中央・関係左・ギア右 | 左「←」、右に ♡段階・ランプ・覚・モード・残通数の 5 個。名前は表示されない | `ChatScreen.kt:120-146` |
| 状況ループ動画 | 型に `video` はある（`character-types.ts:34`、`TouyaClient.kt:261`）が再生器なし | `SituationCardShelf.kt:191`, `ChatScreen.kt:105` |
| 1 通 1 LLM 呼び出し | **守られている。** ゲート → 生成 1 回 → 正規表現の後処理のみ | `api/chat/route.ts:187-200`, `product-behavior.ts:17` |
| 知っていても言わない / 選択記憶 | **守られている。** 規則抽出のみ、記憶 LLM なし | `memory-extract.ts`, `character-bible.ts` |

### 未マージ PR の重なり（統合コスト）

| PR | 起点 | 触る主要ファイル | 状態 |
| --- | --- | --- | --- |
| #4 トップバー・診断削除 | main | `ChatScreen.kt`, `TouyaViewModel.kt`, `MainActivity.kt`, `chat-view.tsx`, `product-copy.ts` | Open |
| #5 Live2D Cubism 骨組み | main | `ChatScreen.kt`（`ChatArtSurface` 抽出）, gradle | Open |
| #6 状況ループ動画 | main | `ChatScreen.kt`（同名 `ChatArtSurface`）, `character-types.ts`, gradle（Media3） | Open |
| #7 特別ゲート + 成長 UX | main | `chat-mode.ts`, `api/chat/route.ts`, `api/mode/route.ts`, 43 ファイル | Draft |
| #8 カード棚 | main | → 実質 #10 に取り込まれた | Open（重複） |
| #9 親密度上下・段階プロンプト | main | `affinity.ts`, `prompt.ts`, `api/chat/route.ts`, `ChatScreen.kt` | Open |
| #11 贈り物 | main | `ChatScreen.kt`, `chat-view.tsx`, `api/gifts` | Open |
| #12 Irodori TTS | main | `ChatScreen.kt`, `chat-view.tsx`, `api/tts` | Draft |
| #13 診断・ダミー絵削除 | daily-loop | 91 ファイル（画像削除含む） | Open |
| #14 個人用クリーンアップ | daily-loop | 36 ファイル、#13 と重複 | Draft |

`ChatScreen.kt` は 7 本（#4 #5 #6 #7 #9 #11 #12）、`api/chat/route.ts` と `prompt.ts` は 2 本（#7 #9）の PR が同時に触る。#13 と #14 は同じ目的で衝突する。順番を決めて 1 本ずつ入れないと、どれも電話に届かない。

---

## 2. Gap analysis vs OzChat

評価: ◎ Oz に勝てる / ○ 同等 / △ 劣る / ✕ 無い。「電話」列は Pixel ビルド（`daily-loop-0477`）で今見えるか。

| # | 領域 | Oz 級コンパニオンの基準 | 燈夜（この枝） | 電話 | 評価 | 根拠 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 初回の魔法 | 台本つきの初対面シーン、名前を聞く、1 分で「覚えた」を見せる | カード + 状況挨拶 + presence の今夜台詞。台本ビートなし。名前は言えば拾うが促さない | 見える | △ | `composeOpening` (`presence.ts:48`), `memory-extract.ts:29-36` |
| 2 | 戻りループ | 通知・日替わりカード・連続ボーナス・「昨日の続き」 | 日替わり（#10 で完了）・不在/連続台詞は良い。**hook は無制限モードで死ぬ**。通知なし。連続日数は UI 未表示 | 半分 | △ | `TouyaViewModel.kt:340`, `chat-view.tsx:378`, `presence.ts:78` |
| 3 | 場面カード棚 | 3 列グリッド、ループ動画、季節枠、衣装 | 3 列グリッド・アバターフィルタ・タブあり。**全部静止 PNG**。衣装 15 枚は 23〜28 KB のベクター人形、実絵は 8 場面 + 4 ポートレートのみ | 見える | △ | `SituationCardShelf.kt`, `public/situations/*/maid.png` |
| 4 | 動き | カードもチャット背景も常に微動（ループ / パララックス / まばたき） | ゼロ。クロスフェードすら無い | — | ✕ | `ChatScreen.kt:103-112` |
| 5 | 時刻の存在感 | 夕方は橙、夜は藍、日付・曜日を会話とビジュアルで感じる | プロンプトと台詞には時刻が入る（`prompt.ts:108-112`、ひよりの presence は today 49 本 + hooks 8 本）。**画面には一切出ない**。空の色はパレット固定 | — | △ | `ChatScreen.kt:96-101` |
| 6 | 親密度の手応え | 毎通の ±、レベルアップ演出、レベルで口調・呼び方・解放が変わる | +1 固定、名前だけプロンプト、演出なし。#9/#7 で埋まるが未マージ | ✕ | ✕ | `affinity.ts:53-65`, `prompt.ts:101-107` |
| 7 | 恋愛ビート | 告白・呼び方の変化・「特別」到達で解放される場面 | `nsfwOnly` 場面 0 件。`minLevel` 場面 = ベクター衣装。到達しても新しいものが無い | ✕ | ✕ | `shared/characters/*.json`（`rg nsfwOnly shared` → 0） |
| 8 | チャット UX | 名前中央、履歴スクロール、時刻、文脈チップ、音声 | 直近 5 通のみ 260 dp 固定枠（`takeLast(5)`）、スクロールバック不可、タイムスタンプ無し（`ChatMessage` に `at` が無い）、チップ固定 3 本、音声なし | 見える | △ | `ChatScreen.kt:92,208-215`, `ApiModels.kt` |
| 9 | 提案チップ | 直前の質問への返答候補、場面固有、時刻固有 | Bond 段階ごとの固定 3 本 | 見える | ✕ | `presence.ts:97-104`, `shared/presence/hiyori.json:244` |
| 10 | 一貫性・記憶 | 長い文脈、要約、呼び名を覚える | **設計は勝てる**（知っていても言わない、選択記憶、1 回生成）。ただし履歴 8 通・260 トークンは DeepSeek 課金向けの値で、ローカルなら小さすぎる | 見える | ◎/△ | `config.ts:15-17`, `memory-extract.ts` |
| 11 | ソフト拒否の誤爆 | 無い（Oz は成人カテゴリで割り切り） | SFW: `尻(?!込\|拭\|目)` + 10 字以下で 4 点 → 「尻もち」が拒否対象。NSFW: 後処理が全文を削ると「その話は、しなくていいよ。」「そんなに並べなくてもいいよ。」に置換され、これがそらしに見える | 見える | △ | `sexual-intent.ts:22,76-82`, `character-bible.ts:87,108` |
| 12 | NSFW の質 | ローカル/専用モデル、拒否ゼロ | hermes-3 経由。プロンプトに「【最優先・NSFW】…そらしで逃げない」を積んで戦っている = モデル選定の問題を文言で抑えている | 見える | △ | `product-behavior.ts:28`, `prompt.ts:143-145` |
| 13 | 収益 | ガチャ・サブスク（Oz）。Emma は Booth 買い切り | AdMob プレースホルダ + Play Billing スタブ。Booth パック構造（キャラ JSON + 絵 + 声を後から追加）は未設計。Android の絵は APK 同梱（`assets/situations`）で追加不能 | — | ✕ | `SituationArt.kt`, `BillingStub.kt`, `ads.ts` |
| 14 | 出荷品質 | — | CI なし、Kotlin 未コンパイルの PR 多数、README は「DeepSeek のみ / 10 通 / AdMob / 性的でない」と主張（現実と乖離）、`shared/characters.json` は死んだ複製 | — | ✕ | `.github` 不在, `README.md:3`, `scripts/split-characters.mjs` |

### 仮説の検証

> 最大の穴は 動画棚の動き / 文脈チップ / 時刻の存在感 / 親密度で見える恋愛ビート

**4 つとも成立。** ただし順序は変える。コードを読むと、これらの前に「PR 統合」「ローカル NSFW バックエンド」「進捗の永続化」「個人モードで壊れる hook」が来る。上の 4 つを作っても、電話に届かず・進捗が消え・NSFW がクラウドのままなら Oz と比べる土俵に立てない。

---

## 3. Top 15 improvements（P0 / P1 / P2）

効果: S = 1 ファイル〜数ファイル、M = 両プラットフォームか API を跨ぐ、L = 新しいサブシステム。

### P0 — これが無いと他が電話に届かない

| # | 改善 | なぜ | 効果 | 依存 |
| --- | --- | --- | --- | --- |
| 1 | **PR 統合の順番を決めて `daily-loop-0477`（または新 `integration` 枝）に 1 本ずつ入れる。** 推奨順: #14（個人用。#13 は閉じる）→ #4（トップバー）→ #9（親密度上下）→ #7（特別ゲート、#9 の `bandEvent` と統合）→ #6（動画、`ChatArtSurface` を #5 と共用）→ #11 → #12。#5 は最後、#8 は #10 に吸収済みなので閉じる | 全機能が main 起点で電話に 1 本も無い。同じ `ChatScreen.kt` を 7 本が触る | M | なし。最初にやる |
| 2 | **ローカル NSFW バックエンド `ollama` を `resolveChatBackend` に追加。** `OLLAMA_BASE_URL` + `OLLAMA_NSFW_MODEL`（Gemma 系の非検閲派生、素の Gemma は拒否が強い）。OpenAI 互換 `/v1/chat/completions` なら `openrouter.ts` の複製で済む。NSFW 解決順: ollama → openrouter → 503 | Emma の前提そのもの。今はクラウドに NSFW 本文が出ている | S〜M | なし |
| 3 | **進捗ストアを永続化する。** 個人用の最短: API を PC/LAN で動かし `data/` を残す（`-PtouyaApiBase` は #13 で配線済み）。Render を使い続けるなら有料ディスクか SQLite（`json-store.ts` の `read/persist` を差し替えるだけの設計になっている）。同時に `affinity/bond/memory/visitors` の export/import を 1 本の JSON にまとめる | 恋愛シムの進捗がデプロイ・再起動・15 分スピンダウンで消える | S（LAN）/ M（永続 DB） | なし |
| 4 | **個人モードの hook と終わり際を直す。** `remaining <= 1` を「そのセッションの最後の返答」に置き換える（アプリ離脱 / 戻る / N 分無操作で保存）。【終わり際】プロンプトも同じ条件に。`QuotaPill` は `debugUnlimited` のとき非表示（#14 が部分対応） | 無制限モードで「昨日の続き」が永久に出ない。戻りループの核が死んでいる | S | #1 の #14 後 |
| 5 | **CI を置く。** GitHub Actions: `npm test` + `cd android && ./gradlew :app:compileDebugKotlin :app:testDebugUnitTest`。PR 作成時に走る | Kotlin を誰もコンパイルしていない。電話で壊れる PR がマージされうる | S | なし |

### P1 — Oz との体感差の本体

| # | 改善 | なぜ | 効果 | 依存 |
| --- | --- | --- | --- | --- |
| 6 | **動きの最小セット（mp4 不要）。** (a) チャット背景に Ken Burns（`animateFloatAsState` でスケール 1.00→1.06 を 14 秒往復）、(b) 場面切替を `Crossfade`、(c) 棚カードに軽いパララックス（スクロール量で `translationY`）、(d) 雨の場面だけパーティクル 1 種。`ChatArtSurface` を先に切り出し（#6 と同じ名前・同じ場所）、mp4 が来たら差し替える | 静止画のままでは「アプリが生きていない」。Oz 感の 7 割はここ | M | #1（#6 の `ChatArtSurface` と衝突しない形で） |
| 7 | **時刻の存在感。** (a) `readClock().part` で空グラデーションを 5 段階に（dawn 薄紫 / morning 白金 / afternoon 中立 / evening 橙→藍 / night 藍→黒）、(b) ヘッダー直下に「9/13 土 · 夜」の細い 1 行、(c) 吹き出しに `at` を持たせ（`ChatMessage` に追加、`ChatStore` に保存）、日付が変わる位置に区切り線。(d) 既存 presence の月・曜日台詞はそのまま活きる | プロンプトにも台詞にも時刻はあるのに画面が知らせない | S〜M | なし（Android + Web） |
| 8 | **文脈チップ（LLM 追加なし、規則）。** 優先順: ①直前の返答が質問文なら応答 2 本（肯定/否定 + 「どうして？」）、②場面 `lines` から 1 本、③時刻帯の 1 本（presence に `suggestionsByPart` を追加）、④記憶があれば「〜の話」1 本、⑤足りない分を既存 `suggestionsByStage`。上限 4、毎通シャッフル | 固定 3 本は 2 回目で無視される。Oz は毎通変わる | M | #7 の時刻 (③のみ) |
| 9 | **親密度の手応え = #9 + #7 を統合して電話へ。** 追加で: (a) **1 日の獲得上限**（例 +6/日）を入れて「特別」を最短 5 日にする（無制限ローカルだと 30 通 = 1 晩で到達、シムにならない）、(b) 進捗バーをヘッダーの関係チップ内に（`AffinityGauge` は既にあるが名簿でしか使っていない）、(c) レベル到達時に presence へ `milestones.{familiar,special,bond}` 台詞を追加し、次回開口で 1 回だけ流す | 今は +1 固定・名前だけ。上下も節目も無い | M | #1（#9, #7） |
| 10 | **「特別」の向こう側に中身を置く。** キャラ 1 人につき `nsfwOnly` 場面 1 本（`minLevel: 2`、実絵 1 枚、`lines` 3 本、専用 greeting）。ひよりから。ベクター衣装（15 枚）は #13/#14 どおり非表示にし、タブも消す | ロック UI と秘匿処理は全部あるのに 0 件。到達の報酬が無い | S（コード）+ 絵 4 枚 | #9 |
| 11 | **メーターを 1 本に見せる。** ヘッダーは Affinity のみ（関係チップ左）。Bond はプロンプトと presence の内部段階として残す。`suggestionsByStage` のキーを Affinity レベルに寄せるか、Bond→Affinity の写像を 1 箇所に置く | ♡「知り合い」と ●●○「顔なじみ」が並ぶと意味が分からない | S | #4 のトップバー後 |
| 12 | **ローカル向けの生成パラメータをバックエンド別に。** `MAX_HISTORY_MESSAGES` 8 / `MAX_COMPLETION_TOKENS` 260 は DeepSeek 課金向け。`ollama` では履歴 20・トークン 400 に。合わせて Gemma 系は日本語の否定命令（「〜しない」×20）に弱いので、NSFW プロンプトは「する側」の短い例 2〜3 本 + 禁止は未成年/違法だけ、に組み直す（`NSFW_ANSWER_DIRECT` の積み増しをやめる） | 20 通の夜のうち 5 往復前を忘れる。プロンプトで拒否と殴り合っている | S〜M | #2 |
| 13 | **ソフト拒否の誤爆を 2 か所で直す。** (a) `sexual-intent.ts`: `body_only_probe`（10 字以下で +2）を `尻/おしり` 単独では発火させない、`尻もち|尻餅|尻上がり|尻すぼみ` を `INNOCENT_IDIOM` に追加、(b) `character-bible.ts:87,108` の空文字フォールバック（「その話は、しなくていいよ。」）を NSFW では**原文を返す**に変更（削るなら数値だけ）。テストは `sexual-intent.test.ts` / `character-bible.test.ts` に追加 | Emma が既に気づいている誤爆の実体がここ。フォールバック文が「そらし」に見える | S | なし |

### P2 — 効くが後

| # | 改善 | なぜ | 効果 | 依存 |
| --- | --- | --- | --- | --- |
| 14 | **Booth パック仕様を先に紙で決める。** 1 パック = `character.json + presence.json + situations/*.png|mp4 + voices/*.wav`。Android は APK 同梱ではなくアプリ内ストレージへ zip 取り込み（`SituationArt.kt` の `file:///android_asset/` を `filesDir` にも向ける）。サーバー側は `catalog.ts` がもう「JSON 1 枚 + フォルダ」なので追加は import 先の分岐だけ。Play Billing / entitlements は使わない | 今の絵の置き方だとパック追加 = 再ビルド。決済でなく配布形式の問題 | M | #10 で場面フォーマットが固まってから |
| 15 | **ドキュメントと死骸の掃除。** README の「DeepSeek のみ / 10 通 / AdMob / 性的でない」を `docs/PERSONAL.md`（#14）と現実に合わせる。`shared/characters.json`（406 行の複製）と `scripts/split-characters.mjs` を削除。`docs/OZ_COMPETE_ROADMAP.md` に PR 番号と状態を追記 | 次に触る人（Emma 自身）が嘘の README を読む | S | #1 後 |

---

## 4. 次スプリント（Emma の個人ローカルビルド向け・2 週間枠）

順番は依存関係。1 本ずつ電話で確かめてから次へ。

**前半: 電話に届く状態を作る**

1. `integration` 枝を `daily-loop-0477` から切る。#14 をマージ（#13 は閉じる）。
2. CI（#5）を先に置き、以後の PR は緑でないと入れない。
3. #4 → #9 → #7 の順でリベースして入れる。#7 の `leveledUp/levelUpMessage` と #9 の `bandEvent` は 1 つの SSE イベントに寄せる。
4. `ollama` バックエンド（#2）。`.env.local` に `OLLAMA_BASE_URL=http://127.0.0.1:11434/v1`。Pixel は `-PtouyaApiBase=http://<PC>:43127`。
5. hook / 終わり際の条件修正（#4 の P0）。`DEBUG` ピル非表示。
6. `data/` を PC に置いたまま運用（Render は当面 SFW デモ用）。export/import は後回しでよい。

**後半: Oz 感**

7. `ChatArtSurface` 切り出し + Ken Burns + Crossfade（#6 の a, b）。mp4 はまだ入れない。
8. 時刻トーン 5 段階 + 日付行 + `at` 付き吹き出し（#7）。
9. 文脈チップ v1（#8 の①②⑤だけ。時刻・記憶は次）。
10. 親密度の日次上限 + ヘッダー進捗バー + 節目台詞（#9 の a, b, c）。
11. ひより 1 人に `nsfwOnly` 場面 1 本（#10）。絵 1 枚。
12. 誤爆 2 か所（#13）。テスト先行。

**このスプリントで触らないもの:** #6 の mp4 実装、#11 贈り物、#12 音声、#5 Live2D、Booth。

**完了の定義:** Pixel で (a) 起動 → 棚が動いて見える、(b) 夜に開くと空が夜、(c) 翌日開くと「昨日の続き」が出る、(d) 特別に到達するとひよりの新しい場面が現れる、(e) NSFW の返答が PC の Ollama から来ている（`ttft_ms ... backend=ollama` ログ）。

---

## 5. まだやらないこと（過剰設計リスト）

| やらない | 理由 |
| --- | --- |
| **Live2D Cubism（#5）の本格導入** | 骨組みは残してよいが、モデル制作コストと Core AAR ライセンスが先に立つ。Ken Burns + クロスフェードで先に「動いている」を作る |
| **端末内 LLM（MediaPipe / llama.cpp on Android）** | PC の Ollama で足りる。Booth 買い手の導入障壁は後で考える |
| **記憶用の 2 回目 LLM 呼び出し・要約モデル・監督モデル** | 1 通 1 回はこの製品の約束。履歴長をバックエンド別に伸ばす方が安い |
| **贈り物に通貨・ガチャ・在庫** | #11 の閉じたカタログ + 日 1 回で十分。Oz のマネタイズを真似る必要はない |
| **通知 / WorkManager** | 個人利用では Emma が自分で開く。文脈チップと時刻トーンの方が先 |
| **Room / Navigation Compose / DI への移行** | `TouyaViewModel` 500 行は読める範囲。`ChatMessage.at` の追加は SharedPreferences のままでできる |
| **Web と Android のドメインロジック共通化（KMP など）** | 二重実装は維持コストだが両側にテストがある。今は機能を届ける方が優先 |
| **Play Billing / entitlements / 匿名アンロックトークン** | Booth は配布形式の問題。決済は不要 |
| **写実系ロスター・5 人目** | 4 人の「特別」の向こう側が空のうちは増やさない |
| **AdMob 実 ID・メディエーション** | Emma の方針で終了。`ads.ts` は #14 で no-op |
| **Render 有料ディスク** | 個人利用は PC 常駐で足りる。公開する段になってから |

---

## 6. 付録: 領域別メモ（詳しく読みたいとき）

### 6.1 初回の魔法 / 戻りループ
- 良い: `shared/presence/hiyori.json` は today 49 本（時刻×曜日×月×段階）+ hooks 8 + absences 9 + streaks 4。`composeOpening` は first / absence / hook / streak / return を分けている。Web と Kotlin で同じ `hashPick` を使い、同じ日に同じ台詞が出る。
- 穴: 初回に「名前を聞く」ビートが無い（`NAME_INTRO` は待っているだけ）。`streak` は UI に出ない。`daily.firstToday` は「今日も来た」の 1 行だけ。hook は §3 #4 のとおり無制限で死ぬ。

### 6.2 棚 / 衣装 / 季節
- ハロウィンは `jstMonth === 10` のみ解放（`situation-unlock.ts:10`）。9 月の今は非表示で正しい。10 月に入った瞬間に実絵が無いベクター衣装が並ぶので、#13/#14 の非表示は 10 月前に必要。
- 実絵 8 枚の質は高い（`cafe-rain.png` 等）。Booth 価値はここにある。衣装 15 枚は明確に負債。

### 6.3 親密度
- `levelFromCount` の閾値 10/30/60。`nextAt/progress` は API に出ているのにチャット画面では使っていない。
- 1 通 +1 は「送れば上がる」で、Oz の「良い会話で上がる」の感触が無い。#9 のヒューリスティックで方向は正しい。日次上限が無いと無制限ローカルで壊れる。

### 6.4 チャット UX
- `ChatScreen.kt:208-215`: 260 dp 固定 + `verticalScroll` + `takeLast(5)`。長押しコピーもない。`LazyColumn` + `reverseLayout` に変えるだけで履歴・スクロール・日付区切りが入る。
- 「違ったと感じた」ボタンが最新返答の下に常駐。個人利用ではギアメニューに移す。
- 場面カードの「SITUATION」「タップして閉じる」は英字ラベル + 説明文で、Emma の「最小限のクローム」に反する。

### 6.5 プロンプト / 記憶 / 一貫性
- プロンプト構成: `systemPrompt` → `bibleContract` → `productBehaviorFor` → 距離 → 親密度 → 時刻 → 間 → 連続 → 終わり際 → 場面 → 記憶 → `NSFW_ANSWER_DIRECT`。日本語で 1.2k 字前後。否定命令が多い（「しない」約 20 回）。70B には効くが、ローカル小型では効きが落ちる。
- `applyBibleFilter` は NSFW でも `stripVolunteeredProfile(keepMeasures)` を通す。「名前：」「趣味：」形式の返答を削るが、これが返答全体だと「そんなに並べなくてもいいよ。」になる。
- 記憶は `(visitor, character)` 単位・10 件・240 字。呼び名はキャラ間で共有されない（ひよりに名乗ると凛音は知らない）。恋愛シムとしては正しい（相手ごとに関係が違う）が、名前だけは訪問者プロファイルに置く選択肢はある。

### 6.6 Booth
- Booth で売れるのは「4 人の実絵 + 声 + 場面」の閉じたパック。今のサーバー依存（PC で Next.js + Ollama）は買い手には重い。ただし今決めるのは配布形式（§3 #14）だけでよく、配布手段（APK 直配布か Play か）は後。
- 権利: 生成絵のモデル利用規約、Irodori-TTS の参照音声、Live2D の個人ライセンス。Booth 前に一覧を 1 枚。

### 6.7 技術負債の短い一覧
- `.github/` 無し（CI 無し）。
- Android: `usesCleartextTraffic` 開発用、`OkHttpClient` タイムアウト 0、`back()` が `showList()` を呼び棚へ戻る命名不一致、`Screen.List` は名簿。
- `shared/characters.json` は死んだ複製。`scripts/split-characters.mjs` も。
- README §冒頭と §収益化は現実と逆。
- Web の `expression.ts` は明度変更のみ。Android に無い。二重実装の片側だけ進んでいる例。
