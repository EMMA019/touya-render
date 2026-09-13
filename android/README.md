# 燈夜 Android（フェーズ 2）

Web MVP と同じ Next.js API を叩く薄い Jetpack Compose クライアントです。公開 Web を Cloudflare Pages に出しても、**API は Render（`https://touya.onrender.com`）のまま**です。このアプリの `API_BASE_URL` は変えません。Web の戻りループ（今夜の台詞・不在・フック・絆・記憶・解放）を Kotlin 側でも同じ規則で組み立てます。

- キャラ一覧（今夜の台詞）・チャット・SSE・残通数・診断・約束・広告なし案内
- 会話は端末に最大20通。昨日のフックは翌日の開口に使う
- **安全ゲート・DeepSeek・日次上限はサーバーだけ**。このアプリは判定を持ちません
- 会員登録なし。端末のインストール UUID だけを持ち、サーバーはハッシュだけ見る
- キャラの system prompt は同梱しません。`GET /api/characters` の公開情報だけ使います

## リポジトリ上の位置

モノレポだがパッケージマネージャは分けていません。

| パス | 役割 |
| --- | --- |
| `/`（ルート） | Web MVP（Next.js）。ここが API |
| `shared/characters/*.json` | キャラの正本（1人1ファイル）。サーバーだけが全文を読む |
| `shared/presence/*.json` | 今夜／不在／連続の台詞。API 経由で Android が読む |
| `android/` | このアプリ |

Web を `web/` に移さなかったのは、既に動いているプレビューと安いデプロイを壊さないためです。

## 必要環境

- Android Studio (Ladybug / 2024.2 以降)
- JDK 17
- 動いている燈夜 API（ルートで `npm run dev`）

## 起動

1. ルートで Web API を出す（既定 `http://0.0.0.0:43127`）
2. Android Studio で `android/` を開く（Gradle wrapper は Studio が生成できます）
3. `API_BASE_URL` を実行環境に合わせる（下表）
4. `usesCleartextTraffic` は開発用の HTTP です

### API_BASE_URL

値は `app/build.gradle.kts` の `defaultConfig` です。

```
buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:43127\"")
```

| 実行環境 | `API_BASE_URL` |
| --- | --- |
| エミュレータ | `http://10.0.2.2:43127`（既定。ホストの `localhost:43127` に届く） |
| 実機（同じ LAN） | `http://<PCのLAN IP>:43127`。例: `http://192.168.0.12:43127` |

実機では PC の IPv4（`ip a` / `ipconfig`）に書き換え、ルートで `npm run dev` を出したままにしてください。ファイアウォールで 43127 を許可します。`127.0.0.1` は実機からホストの Next.js には届きません。

匿名インストール ID は `x-touya-vid` で送ります。Cookie は使いません。サーバーは SHA-256 した値だけを日次カウントと性的エスカレーションに使います。再インストールで残通数が戻るのは MVP では許容です。

広告は **AdMob** 前提（バナー + リワードで +通数）。`BillingStub` は後から Google Play Billing を足すための空実装です。メールログインは作りません。

時刻は **日本時間**。無料枠も「今夜」の台詞も JST です。

## 使っている API

```
GET  /api/health
GET  /api/session        # 残通数 + chatMode / adsEnabled。ID は返さない
GET  /api/mode           # モードと年齢確認
POST /api/mode           # { confirmAge, chatMode }  NSFW は年齢確認後だけ
GET  /api/characters     # 公開情報 + presence。prompt / bible は含まない
GET  /api/companion      # ?characterId=  絆・記憶・解放済み場面 (unlocked/locks)・story・進行中の章 script
POST /api/story/choice   # { characterId, chapterId, beatId, choiceId }  台本の選択肢。LLM も通数も動かない
POST /api/story/advance  # { characterId, chapterId, beatId }            line / retry を次へ
GET  /api/memory         # 覚えていること
DELETE /api/memory       # { characterId, text }
POST /api/feedback       # { characterId, situationId, assistantText }
GET  /api/usage
POST /api/reward         # AdMob リワード完了のスタブ。+3通
POST /api/chat           # SSE: quota / bond / affinity / mode / story / delta / replace / done / error
                         #   free ビートのときだけ body に chapterId / beatId を足す
```

チャットはポートレート全面（パレットの夜空）。残通数は数字だけ。場面チップで衣装／背景を切り替えます。服は着たまま（AdMob）。年齢は出しません。MVP の名簿はアニメ4人です。

### 出会い（Ch0）と解放

初めて開いたキャラは `companion.story.beat != null` で返ってきます。`TouyaViewModel.open()` は挨拶（`composeOpening`）を出さず、`script` の現在ビートを吹き出しにして（id `story-{chapterId}-{beatId}-{i}`、再開しても二重にならない）、背景を章の `situationId` に切り替え、コンポーザーの代わりに `StoryChoiceRow`（選択肢／つづける）を出します。タップは `client.storyChoice` / `storyAdvance` で、サーバーが次のビートを返します。`end` に着くと `story.beat` が `null` になりコンポーザーが戻ります。

解放は **サーバーの `unlocked` / `locks` が正**。`domain/Unlock.kt` は `situation-unlock.ts` の写し（帯＋フラグ、日数は見ない）で、API に届かないときの表示フォールバックだけです。ロック文言は `locks[id]` の理由（band / chapter / flag / season / mode）から出します。NSFW トグルは `story.nsfwEligible == false` のとき年齢ゲートを開かず「まだ、そこまでじゃない。」を出します。

### 画像の同期

状況絵は Web の `public/situations/` が正本です。本番 PNG を置いたらルートで:

```
npm run sync-android            # android/app/src/main/assets/situations/ に写す
npm run sync-android -- --check # 差分があれば exit 1
```

`SituationArt.kt` が API の `/situations/{id}/{scene}.png` を `file:///android_asset/situations/...` に写像します。巨大な PNG は git に入れず、ローカルで置いてから同期してください。

診断の10問は `domain/Diagnosis.kt` に Web と同じ配点で置いてあります。結果は端末の中だけです。

単体テスト（時刻・開口・診断・解放・台本ランナーの吹き出し）:

```
# Android Studio の Gradle :app:testDebugUnitTest
```
