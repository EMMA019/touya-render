# Personal-use (Emma)

燈夜 is running as a personal app first. Booth can come later. There is no AdMob path in the UI.

## `.env.local`

```bash
cp .env.example .env.local
```

Keep these in `.env.local`:

```
TOUYA_DEBUG_UNLIMITED=1
```

Optional equivalent:

```
TOUYA_PERSONAL=1
```

Either flag makes the free tier unlimited (same `debugUnlimited` quota the client already respects). Affinity and content gates stay on. The UI does not nag about 無料枠 or 広告を見て.

`NEXT_PUBLIC_ADS_ENABLED` stays `0`. Do not add AdMob unit IDs.

The API the phone talks to must have the same unlimited flag (local `npm run dev` or the Render service env). Client-only `.env` is not enough if Android hits `https://touya.onrender.com`.

## Shelf art

Generated SVG silhouettes and missing `.png` files are stubs. The shelf hides those gray placeholders. Drop a real PNG/WebP/JPEG under `public/situations/{id}/` (and Android assets if you want offline) and it will show — SFW or NSFW.
