# 燈夜（とうや）

夜に話せる、気軽なコンパニオン。**普通のキャラチャットではありません。** 公開 SaaS の薄い MVP です。モデルは **DeepSeek のみ**、無料は **1日10通**、運営は **AdMob** 前提です。会員登録はありません。性的なチャットではありません。

Kairi（ローカル BYOK + 接地レイヤー）の「短い文脈」「生成後の軽いフィルタ」「安全ゲート」は参考にしました。こちらは鍵をユーザーに持たせない公開サービスです。検索引用の金融接地も、監督モデルの再生成も移植していません。

## 普通のキャラチャットとの違い

よくあるキャラチャットは、設定を自分から並べ、雑談を全部覚えるか何も残さず、性的ロールプレイを開くか壊れた拒否をし、会員登録で個人情報を集め、高い多段モデルで回します。燈夜はそれをしません。違いはコピーではなく、コードの約束です。

| よくある動き | 燈夜 |
| --- | --- |
| 性格・プロフィールを聞かれていないのに読み上げる | **知っていても言わない。** 聖書と短い記憶は持つ。聞かれたときか、短い返事に自然なときだけ一言。箇条書き禁止（`src/lib/product-behavior.ts` / `src/lib/prompt.ts`） |
| 全部覚えるか、何も残さない | **選んで覚える。** 「覚えて」と続く好み・名前だけ。雑談の1通は残さない。記憶用 LLM は呼ばない（`src/lib/memory-extract.ts`） |
| 性的ロールプレイが開放、または拒否が壊れる | **モデルに送らない。** 事前ゲート → 定型拒否 → 3回で30分停止。NSFWボットではない（`src/lib/chat-gate.ts`） |
| 会員登録・メール・氏名 | **登録なし。** 端末のランダム UUID をハッシュするだけ。1日10通。許可された1通につき DeepSeek は1回 |
| テキスト中心のチャット欄 | **キャラが画面の主役。** 全身ポートレートと衣装切替。残通数は数字だけ |
| 検索接地や監督＋書き直し | **薄い一貫性。** 閉世界の聖書。ソフトフィルタは直すだけで、呼び直さない |
| 毎日同じ挨拶 | **今夜が違う。** 時刻・曜日・季節・連続日・不在を、LLM なしの台詞で出す（`shared/presence/`） |

実装の入口: プロンプト契約は毎回 `PRODUCT_BEHAVIOR` を足します。記憶の書き込みは `MEMORY_WRITE_POLICY`。ランディングの文言は `src/lib/product-copy.ts` で、上の表と同じ約束です。SFW/NSFW の骨格（年齢確認・広告停止・サーバー強制）は [docs/dual-mode.md](docs/dual-mode.md)。NSFW 本文はまだ出ません。

## リポジトリ構成（モノレポ）

パッケージマネージャは分けていません。**Web をルートに残し**、Android を隣に置いています。既に動く Web MVP と安いデプロイを壊さない選択です。

| パス | 役割 |
| --- | --- |
| `/` | Web MVP + API（Next.js）。これが正本 |
| `shared/characters/*.json` | キャラ定義の正本（1人1ファイル）。サーバーだけが全文を読む |
| `shared/presence/{id}.json` | 今夜の台詞・不在・明日への引き。LLM は増やさない |
| `android/` | フェーズ 2。同じ API を叩く Kotlin / Compose シェル |

Android は安全判定を持ちません。性的ゲート・DeepSeek・日次 10 通はすべてサーバーです。詳細は [android/README.md](android/README.md)。

## 無料枠のルール（明確な定義）

**ユーザーの送信 1 回 = 1 通。日本時間（JST）の 1 日あたり 10 通まで。**

- キャラを変えても合算します。
- 画面に出す最初の挨拶は数えません。
- 上限に達すると送信できません。日本時間の 0 時に回復します。
- 会員登録なし。名前・メール・電話・住所は集めません。
- 端末が作ったランダム UUID を送り、サーバーは **ハッシュだけ** を日次カウントと性的エスカレーションに使います。
- 再インストールやストレージ削除で残通数が戻るのは、MVP では許容です。

会話スレッド数ではなく送信回数にしたのは、1 本の会話を無限に伸ばせないようにするためです。

## 必要なもの

- Node.js 22 前後
- DeepSeek API キー（[platform.deepseek.com](https://platform.deepseek.com/)）
- 本番では書き込み可能なディスク（日次カウント用）

鍵が無いときはデモ返答をストリームします。UI の確認はそのままでできます。

## セットアップ

```bash
cp .env.example .env.local
# DEEPSEEK_API_KEY を入れる（無くてもデモは動く）
npm install
npm run dev
```

開く URL: `http://127.0.0.1:43127`

```bash
npm test
npm run build
npm start
```

## 環境変数

| 変数 | 役割 |
| --- | --- |
| `DEEPSEEK_API_KEY` | サーバー専用。クライアントには出しません。 |
| `DEEPSEEK_MODEL` | 既定 `deepseek-chat`（安価な通常チャット）。 |
| `TOUYA_DEMO` | 未設定: 鍵が無いときだけデモ。`1` でデモ強制。`0` でデモ禁止。 |
| `TOUYA_DEBUG_UNLIMITED` | ローカル専用。`1` で日次無料枠を無視（親密度・内容ゲートはそのまま）。本番では未設定。 |
| `USAGE_STORE_PATH` | 日次カウントの JSON。既定 `./data/usage.json`。 |
| `SEXUAL_STORE_PATH` | 性的エスカレーションの JSON。既定 `./data/sexual-strikes.json`。 |
| `MEMORY_STORE_PATH` | キャラ別の短い記憶。既定 `./data/memory.json`。 |
| `NEXT_PUBLIC_ADS_ENABLED` | `0` で広告枠を隠す。NSFW モード中はこれと別に広告を止める。 |
| `VISITOR_STORE_PATH` | 年齢確認と `chatMode`。既定 `./data/visitors.json`。 |
| `NEXT_PUBLIC_API_BASE` | ブラウザが叩く API の Origin。空なら同一オリジン。Cloudflare 静的書き出しでは `https://touya.onrender.com`。 |
| `TOUYA_ANON_PEPPER` | インストール UUID をハッシュする胡椒。変えるとカウンタが別物になります。 |
| `ENTITLEMENTS_STORE_PATH` | Play Billing スタブの JSON。既定 `./data/entitlements.json`。 |
| `BOND_STORE_PATH` | 会った日数。既定 `./data/bonds.json`。 |
| `AFFINITY_STORE_PATH` | 親密度カウンタ。既定 `./data/affinity.json`。日次リセットしない。 |
| `FEEDBACK_STORE_PATH` | 「違ったと感じた」の匿名ログ。既定 `./data/feedback.json`。 |
| `NEXT_PUBLIC_ADMOB_APP_ID` | AdMob アプリ ID。未設定のままプレースホルダ。**仮の ID を書かない。** |
| `NEXT_PUBLIC_ADMOB_BANNER_UNIT` | バナーユニット。空でよい。 |
| `NEXT_PUBLIC_ADMOB_REWARDED_UNIT` | リワードユニット。空でよい。 |

`.env*` は git 対象外です。`.env.example` だけをコミットしています。

## コストを抑える前提

- ホスティングは **安い VPS / Fly / Railway** の 1 プロセスを想定。サーバーレスの無料枠に DB を足さない。
- LLM は DeepSeek の chat モデルのみ。thinking / 高い max_tokens は使わない。
- **許可された1通につき DeepSeek は1回。** 監督モデル・複数サンプル・接地の再生成はしない。kairi の多段ループは遅いので、こちらは最初のトークン（TTFT）を優先する。
- 履歴は直近 8 メッセージ、1 通 400 文字、生成は約 220 トークン。
- 危険な入力は LLM の前で拒否してトークンを使わない。
- 日次カウント・記憶・会った日は **ローカル JSON**（`src/lib/json-store.ts`。後から KV に差し替え可能）。
- 会話本文はサーバーに置かず、端末の localStorage に直近20通だけ残します。
- 認証・メール・分析・別コンポーネントライブラリは入れていません。会員登録は今後も足しません。

Vercel のような読み取り専用 FS では JSON が残らないので、単一インスタンスのメモリに落ちます。耐久性が要るときは安価な VPS に置くか、後から Turso / 無料 Redis へ `src/lib/usage.ts` だけ差し替えてください。

## 収益化（登録なし）

燈夜は **広告つきの気軽なコンパニオン** です。成人向け／NSFW 商品としては出しません（広告ネットのポリシーのため）。チャットに会員登録は不要です。

### 匿名 ID

1. クライアントがインストール UUID を作る（Web は `localStorage`、Android は SharedPreferences）。
2. `x-touya-vid` で送る。個人情報は含めない。
3. サーバーは SHA-256（`TOUYA_ANON_PEPPER`）した値だけを `usage` / `sexual-strikes` / 記憶に書く。
4. `/api/session` は残通数だけ返す。ID は返さない。

### 広告（第一候補: Google AdMob）

Android 向けにバナー + リワードがあり、日本向け、閲覧にアカウントが要らないためです。

| 枠 | 場所 | 今 |
| --- | --- | --- |
| バナー | キャラ一覧 / チャット上部 | AdMob ラベルのプレースホルダ |
| サイド | デスクトップ余白 | 同上 |
| インフィード | 長い有料セッションのみ | 無料10通では出さない |
| リワード | 「広告を見て +3通」 | 完了スタブ（1日2回まで） |

Web MVP は AdMob web / Google publisher tags の差し込み位置だけ用意しています。**本物のユニット ID は書かない。** ポリシー確認後に公式スニペットへ置換します（`src/lib/ads.ts`）。

埋まりが弱いときの将来案（未実装）: AppLovin、Unity Ads のメディエーション。

### 有料（後から。登録はしない）

- Android: **Google Play Billing** の買い切りまたは安い定期。日次上限を上げる、バナーを消す。Play アカウントは Google 側。アプリは PII を持たない。スタブは `android/.../BillingStub.kt` と `data/entitlements.json`。
- Web: 広告先行。必要なら後から匿名アンロックトークン。メールログインは作らない。

プレミアム時の日次上限は 40 通（`PREMIUM_DAILY_TURNS`）。チャット開始に課金は不要です。

## 今夜の4人

MVP はアニメ名簿だけです。写実／実写は後から素材が揃ってから足します。系統スイッチは出しません。

| id | 名前 | 口調 | 状況 | 拒否 |
| --- | --- | --- | --- | --- |
| `hiyori` | 桃瀬ひより（大学生） | 甘え | カフェ / 並木 / ハロウィン / メイド / ナース / 巫女 | やーん、えっちー！しらないっ |
| `rione` | 橘川凛音（秘書） | ツンデレ | オフィス / 書店 / ハロウィン / メイド / ナース / アイドル | バカー！… |
| `shiraishi` | 白石凛（研究者） | クール | 屋上 / 公園 / ハロウィン / メイド / ナース | そういう質問には答えません |
| `clara` | クララ・ベルジュ（実業家） | エレガント | テラス / 書庫 / ハロウィン / メイド / ナース / 巫女 | ふふ、そういう話題は少し野暮ね。 |

体型数値は聖書の内部設定だけです。画面にも公開 API にも出しません。年齢は使いません。

## 新キャラの追加方法

チャットのパイプライン（ゲート・DeepSeek・記憶）は触りません。**JSON 1枚 + 画像フォルダ** を足して再起動するだけです。5人目も同じです。

許可された1通につき DeepSeek は1回だけです。監督・複数サンプル・接地の再生成は入れません。kairi の多段ループより、最初のトークンが速いことを優先します。

### ファイルの約束

```
shared/characters/_template.json   雛形（名簿に出ない）
shared/characters/{id}.json        1人1ファイル。ファイル名 = id
public/situations/{id}/{scene}.png 状況画像。キャラだけ。名札・服の文字・看板なし
public/situations/{id}/{scene}.svg プレースホルダ原画（`npm run portraits`）
public/portraits/{id}.png          名簿・アバター用ポートレート
```

`id` は英小文字・数字・ハイフン（例: `suzune`）。`_` で始まる JSON は読みません。年齢フィールドは置きません。

### 手順

1. **テンプレートをコピーする。**

```bash
npm run new-character -- suzune
```

手動でも同じです。

```bash
cp shared/characters/_template.json shared/characters/suzune.json
mkdir -p public/situations/suzune
```

2. **`shared/characters/suzune.json` を埋める。**

   - `id` はファイル名と同じにする（スクリプトは既に書き換え済み）。
   - 名前・読み・職業・一言・挨拶・口調。
   - **短い** `systemPrompt`。必須: 「フィクションの大人の女性」「自分から並べない」。年齢の数字は書かない。
   - MVP はアニメだけ。写実を足すときは後から JSON 1枚と画像。系統スイッチはまだ出しません。
   - おとなのフィクションだけ。学生服・JK・未成年に見える設定は禁止。
   - `refusalStyle` は `amae` / `tsun` / `cool` / `gentle` / `elegant`。新しい口調を足すときだけコードが要る。
   - `situations` は配列。`costume` は衣装（`maid` / `nurse` / `miko` / `idol` / `halloween`）。`season: "halloween"` は季節枠。
   - 各 `look` に **「服や背景に文字を焼き込まない」** を残す。服は着たまま。ランジェリー主役・肌の強調は禁止。
   - `image` は `/situations/suzune/{scene}.png`。JSON は実在する `.png` を指す（壊れた `.svg` パスは使わない）。
   - `bible` に閉世界を短く。`never` に「年齢を数字で言う」。体型数値があっても UI には出さない。
   - `demoReplies` は鍵が無いときの短い返答。無ければ挨拶を使う。
   - `portrait` はプレースホルダ用の任意ヒント（髪の長さ、ハロウィン小物）。画像があれば無くてよい。

3. **画像を置く。**

   - キャラだけ。名札、服の文字、背景の看板（日英とも）は焼き込まない。文字化けと別人名の原因になる。
   - 名前は UI の `name` だけ。`alt` も空。
   - プレースホルダ SVG は `npm run portraits`（名簿を読んで `public/situations/{id}/` に SVG を書き、欠けている PNG だけ埋める。既存の写真 PNG は上書きしない）。本番イラストがあれば PNG を上書き。
   - 検証は `src/lib/situation-art.test.ts`。

4. **確認して再起動 / 再デプロイ。**

```bash
npm test
npm run dev
```

本番はデプロイしてプロセスを再起動します。新しい JSON は起動時に読みます。`/api/chat` も Android も、名簿が増えた分だけそのまま出ます。

管理画面は後回しでよいです。MVP はこのファイル約束と `_template.json` です。

system prompt はサーバーにだけ置きます。`/api/characters` と Android には出しません。Android に JSON をコピーして同梱しないでください。

チャット画面はモバイル優先の全身ポートレート。文言は少なく、残通数は右上の数字だけ。AdMob 向けに下着見せ構図は使いません。

## 安全

- 登場キャラはおとなの創作です。年齢はデータにも画面にも出しません。未成年に見えるキャラは置きません。
- 見た目はちょいセクシー（スタイリッシュで少し色気）まで。裸・露骨・ランジェリー主役は置かない（AdMob）。
- 未成年を性的に扱う入力は拒否します（`src/lib/safety.ts`）。
- 返答は短い接地フィルタで「実在の人間」主張や雑な断定を弱めます（`src/lib/grounding.ts`）。Kairi の市場向け接地パイプラインは移植していません。

## 性的な内容の扱い（最優先）

燈夜は性的チャットではありません。性的な要求・体の質問・エロい誘導は **DeepSeek に送りません**。アプリ側で判定して、キャラごとの定型拒否だけを返します。

判定は単語の禁止リストだけに頼らず、意図の特徴（体＋サイズ質問、脱衣要求、露骨な行為語、拒否のあとの「もっと」）と、無害な文脈（哺乳瓶の「おっぱい」、胸の痛み、尻込み、コーヒー何カップ）を組み合わせます。実装は `src/lib/sexual-intent.ts` と `src/lib/chat-gate.ts`。

### エスカレーション（同一訪問者 × 同一キャラ）

1. 1回目: 軽い受け流し（中身は答えない）
2. 2回目: はっきり拒否
3. 3回目: 警告し、**そのキャラとの会話を30分間停止**。記録は `data/sexual-strikes.json`。リロードしても解除されません。期限が切れたらカウントは 0 に戻ります。

例（1回目。答えの数値や描写は含みません）:

- 甘え（ひより）: 「やーん、えっちー！しらないっ」
- ツンデレ（凛音）: 「バカー！そんなこと聞くんじゃない！」
- クール（白石凛）: 「そういう質問には答えません」
- 上品（クララ）: 「ふふ、そういう話題は少し野暮ね。別のこと話しましょう」

3回目の文面は口調を捨てて事務的にします。拒否のあとで話題を広げたり聞き返したりしません。

もし何らかの経路でモデルが動いてしまった場合は、出力を見て性的なら定型拒否で上書きします（`src/lib/output-moderation.ts`）。主防御は「送らない」ことです。

性的な送信も無料枠の1通に数えます。停止中の再送信は数えません。

## 記憶と設定の一貫性（薄い版）

Kairi の「記憶 + 接地」は参考にしますが、検索引用スタックも、監督モデルの再生成も使いません。**許可されたユーザー送信 1 通につき DeepSeek は 1 回だけ**です。

### 知っていても言わない

聖書・短い記憶・状況はプロンプトに持たせます。**自分から並べません。** 聞かれたときか、短い返答に自然に必要なときだけ一言。自己紹介の箇条書きや体型数値の列挙は禁止です（`src/lib/prompt.ts`）。

### 記憶（選んで残す）

- 単位は `(visitorId, characterId)`。ファイルは `data/memory.json`。
- 残すのは高シグナルだけ: 明示の「覚えて」、はっきりした好み、名前、続く関係の一言。雑談の1通ごと、今日だけの気分、雑学、性的な内容、体型数値は保存しません。
- 抽出は規則のみ。記憶用の LLM は呼びません。
- プロンプトに入れるのは短い要約（目安 240 字）だけです。復唱はさせません。

### キャラ聖書（閉世界）

- `shared/characters/{id}.json` の `bible` が正本です。年齢・仕事・状況と矛盾する過去を作らせません。
- 体型数値があってもサーバー専用です。カードや API 公開面には出しません。自分からも言いません。
- ニュース速報を「知っている」とは言わせません。
- 生成後に短いソフトフィルタ（`src/lib/character-bible.ts`）をかけます。矛盾や数値の漏えいは直すだけで、DeepSeek を呼び直しません。

## デプロイ（安く）

1. このリポジトリを安い VPS か Fly / Railway に置く。
2. `DEEPSEEK_API_KEY` をホストのシークレットに入れる。
3. `data/` が永続化されるようにする（ボリューム 1 個で足りる）。
4. `npm run build && npm start`。既定ポートは `43127`。`PORT` を見るホストなら `npx next start --port $PORT --hostname 0.0.0.0`。

Docker を使う場合:

```bash
docker build -t touya .
docker run --env-file .env.local -p 43127:43127 -v touya-data:/app/data touya
```

追加の有料サービスは不要です。CDN やオブジェクトストレージも必須ではありません。

## 構成

```
src/app/api/chat          ゲートのあとでのみ DeepSeek / デモ
src/app/api/session       残通数のみ（ID は返さない）
src/app/api/reward        AdMob リワード完了スタブ
shared/characters/*.json  キャラ正本（1人1ファイル。サーバー専用）
scripts/new-character.mjs テンプレ複製。パイプラインは触らない
src/lib/anonymous-id.ts   インストール UUID のハッシュ
src/lib/chat-gate.ts      性的内容の事前ゲート（API禁止）
src/lib/product-behavior.ts 知っていても言わない／1回生成／NSFWに乗らない
src/lib/product-copy.ts     ランディングと同じ約束の文言
src/lib/memory-extract.ts 覚えて + 規則抽出（LLMなし）
src/lib/character-bible.ts 閉世界の契約とソフトフィルタ
android/                  Compose クライアント（同じ API）
```

Android から API を叩くときは `x-touya-vid` にインストール UUID を付けます。サーバーはハッシュします。
