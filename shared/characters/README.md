# キャラカタログ

1人 = `shared/characters/{id}.json` + `public/situations/{id}/` の画像。

任意で状況カード用の短いループ動画を置けます。`situations[].video` はパス文字列（例: `/situations/hiyori/cafe-rain.mp4`）。`image` の PNG は必須のままです。置き場所と作り方は [android/OZ_SITUATION_VIDEO.md](../../android/OZ_SITUATION_VIDEO.md)。

`_` で始まるファイル（`_template.json`）は名簿に出ません。チャットのパイプラインは触りません。許可された1通につき DeepSeek は1回だけです。

MVP はアニメ4人です。写実は後から素材が揃ってから足します。`artStyle` は任意（無いときは `anime`）。系統スイッチは出しません。

`welcomeBack` / `farewell` / `offline` / `portraitImage` も JSON に書いてください。衣装場面は会った日が重なるまでロックされます。

今夜の台詞・不在・明日への引きは `shared/presence/{id}.json` です。キャラ本体と同じ id。無いと、挨拶だけになります。

手順はリポジトリ直下の README「新キャラの追加方法」を見てください。
