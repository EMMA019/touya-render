# 燈夜 Android（フェーズ 2）

Web MVP と同じ Next.js API を叩く薄い Jetpack Compose クライアントです。公開 Web を Cloudflare Pages に出しても、**API は Render（`https://touya.onrender.com`）のまま**です。このアプリの `API_BASE_URL` は変えません。Web の戻りループ（今夜の台詞・不在・フック・絆・記憶・解放）を Kotlin 側でも同じ規則で組み立てます。

- **状況カード棚が既定ホーム**（3列。タップでその相手＋場面のチャット）・名簿は残す・SSE・残通数・約束・広告なし案内
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
| 実機（同じ LAN） | `-PtouyaApiBase=http://<PCのLAN IP>:3000`（または API のポート） |

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
GET  /api/characters     # 公開情報 + presence + 今日の daily。prompt / bible は含まない
GET  /api/daily          # 今日の相手 / 今日のシチュ（JST。nsfwOnly は出さない）
GET  /api/companion      # ?characterId=  絆・記憶・解放済み場面
GET  /api/memory         # 覚えていること
DELETE /api/memory       # { characterId, text }
POST /api/feedback       # { characterId, situationId, assistantText }
GET  /api/usage
POST /api/reward         # AdMob リワード完了のスタブ。+3通
POST /api/chat           # SSE: quota / bond / delta / replace / done / error
```

既定ホームは状況カード棚です。名簿は棚から入れます。チャットはポートレート全面（パレットの夜空）。残通数は数字だけ。場面チップで衣装／背景を切り替えます。状況に短いループ動画があるときは PNG のまま落ちます（再生は [OZ_SITUATION_VIDEO.md](OZ_SITUATION_VIDEO.md) / PR #6）。服は着たまま（AdMob）。衣装は会った日が重なると開きます（ハロウィンは10月）。`nsfwOnly` は特別になるまでロックします。年齢は出しません。MVP の名簿はアニメ4人です。ロードマップは [docs/OZ_COMPETE_ROADMAP.md](../docs/OZ_COMPETE_ROADMAP.md)。

相手診断の入口は外してあります（棚・名簿・`/diag`）。配点ファイルは残っていますが画面には出しません。

## 実機へ入れ直す

棚ブランチ（この系統）をクリーンビルドするとき:

```
cd android
./gradlew :app:installDebug -PtouyaApiBase=http://192.168.0.4:3000
```

API のホストとポートは、電話から届く LAN 上の Next.js / ローカルスタックに合わせてください。既定（プロパティなし）は `https://touya.onrender.com` です。

単体テスト（時刻・開口・解放）:

```
# Android Studio の Gradle :app:testDebugUnitTest
```
