# shared/

キャラ定義の正本です。**サーバーだけが全文を読みます。**

`shared/characters/{id}.json` に system prompt、`refusalStyle`、複数の `situations`、閉世界の `bible`（体型数値を含む場合あり）を置きます。`_` で始まるファイル（`_template.json`）は名簿に出しません。年齢は書きません。Android やブラウザにこのフォルダをコピーして同梱しないでください。公開プロフィールは `GET /api/characters` 経由で、聖書・look・数値は削ります。

5人目を足すときは JSON 1枚と `public/situations/{id}/` だけです。チャットのパイプラインは触りません。手順はリポジトリ直下 README の「新キャラの追加方法」。

安全ゲート（性的内容・未成年）は `src/lib/chat-gate.ts` にあり、どのクライアントからも迂回できません。聖書は持たせても自分から並べさせません。記憶は選んで残します。許可された1通につき DeepSeek は1回です。

状況画像はキャラだけです。名札・服の文字・看板は焼き込みません。名前は UI 側の `name` だけです。

`shared/gifts.json` は閉じた贈り物カタログ（3〜6個）です。ユーザー追加は受けません。`premium: false` は Booth 後の有料スキン用フックで、決済 UI は置きません。
