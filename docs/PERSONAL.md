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

Generated SVG silhouettes and the tiny (~25KB) rasterized costume placeholders are hidden on the shelf. Real situ rasters (typically 200KB+) still show — SFW or NSFW. Drop a real PNG/WebP/JPEG under `public/situations/{id}/` and it will appear.
