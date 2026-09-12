# Cloudflare Pages（公開 Web）+ Render（API）

公開ブラウザ UI は **Cloudflare Pages**（または Workers + Assets）に置き、DeepSeek / 残通数 / 記憶 / `/api/*` は今までどおり **Render**（`https://touya.onrender.com`）に残します。Android は Render を直接叩くので、この分割で URL を変えません。

```
ブラウザ  →  Cloudflare Pages (静的 HTML / JS / 画像)
                └─ fetch https://touya.onrender.com/api/*
Android  →  https://touya.onrender.com/api/*   （変更なし）
```

## Render 側（すでにデプロイ済み）

- サービス種別: Web Service
- Build: `npm install --include=dev && npm run build`
- Start: `npx next start --port $PORT --hostname 0.0.0.0`
- Health: `/api/health`

Render の **Environment** に、Cloudflare の公開オリジンを足します。

| 変数 | 値 |
| --- | --- |
| `TOUYA_CORS_ORIGINS` | カスタムドメインがあるときだけ。例: `https://touya.example.com`。カンマ区切り可。`*` で全オリジン許可。 |

未設定でも `*.pages.dev` / `*.workers.dev` / `http://127.0.0.1:43127` / `https://touya.onrender.com` は許可されます。Pages の `*.pages.dev` だけで使うなら、この変数は空のままで構いません。

`NEXT_PUBLIC_API_BASE` は **Render には入れない**（同一オリジンのまま）。入れると Render 上の UI まで別ホストの API を呼びます。

デプロイ後に CORS を確認:

```bash
curl -sI -X OPTIONS https://touya.onrender.com/api/health \
  -H "Origin: https://YOUR_PROJECT.pages.dev" \
  -H "Access-Control-Request-Method: GET"
```

`Access-Control-Allow-Origin` が Origin と一致すればブラウザから呼べます。

## Cloudflare Pages ダッシュボード

1. [Workers & Pages](https://dash.cloudflare.com/) → **Create** → **Pages** → この GitHub リポジトリを Import。
2. Framework preset: **Next.js (Static HTML Export)** でも、下記を手入力しても同じです。
3. Build settings:

| 項目 | 値 |
| --- | --- |
| Production branch | `main`（またはこの PR をマージする枝） |
| Build command | `npm install --include=dev && npm run build:cf` |
| Build output directory | `out` |
| Root directory | `/`（リポジトリ直下） |
| Node version | `20`（Pages の Environment variable `NODE_VERSION=20`） |

4. **Environment variables**（Production / Preview の両方）:

| 変数 | 値 | 必須 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | `https://touya.onrender.com` | **必須**（ビルド時にブラウザ JS へ埋め込まれる） |
| `NODE_VERSION` | `20` | 推奨 |
| `TOUYA_CF_PAGES` | 不要。`build:cf` がセットする | — |
| `DEEPSEEK_API_KEY` | **置かない**（フロントに鍵を出さない） | — |

5. Save and Deploy。完了すると `https://<project>.pages.dev` で UI が開き、チャットは Render の `/api/chat` を呼びます。

カスタムドメインは Pages の **Custom domains** で足します。そのオリジンを Render の `TOUYA_CORS_ORIGINS` にも書いてください。

## ローカルで静的書き出しを確認

```bash
NEXT_PUBLIC_API_BASE=https://touya.onrender.com npm run build:cf
npx --yes serve out -l 8788
```

`http://127.0.0.1:8788` を開き、DevTools の Network で `/api/*` が `touya.onrender.com` に向かうことを確認します。`build:cf` は API ルートを一時的に退避してから `output: "export"` します。成果物は `out/`、中間は `.next-cf/` なので Render 用の `.next` は上書きしません。終わると `src/app/api` は元に戻ります。

## Workers + Assets（任意）

Pages の代わりに:

```bash
npm run build:cf
npx wrangler pages deploy out --project-name touya-web
```

`wrangler.toml` の `pages_build_output_dir = "out"` が出力先です。

## 動かないとき

| 症状 | 確認 |
| --- | --- |
| チャットが CORS エラー | Pages の Origin が `*.pages.dev` 以外なら Render に `TOUYA_CORS_ORIGINS` を追加して再デプロイ |
| `/api/*` が Pages 側 404 | `NEXT_PUBLIC_API_BASE` が **ビルド時** に入っているか。Pages で変数を足したあと **再ビルド** |
| 残通数が visitor_missing | ブラウザが `x-touya-vid` を付けているか（初回ロード後にリロード） |
| 新しいキャラの `/c/xxx` が 404 | `generateStaticParams` はビルド時の名簿。JSON を足したら Pages を再デプロイ |
| Android が壊れた | API は Render のまま。`API_BASE_URL=https://touya.onrender.com` を変えない |
