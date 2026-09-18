# Oz-style situation video（燈夜）

Chat art stays **Coil PNG** by default. If a situation opts into a short looping clip, Android plays it **muted, looping, scale-to-fill** under the same chrome (header / chips / bubbles / input). Switching chips swaps art/video like Oz situation cards.

Full Live2D Cubism (PR #5 shell) can wait. Leave that shell intact when it merges. **Do not** add an Expandable Live2D marketplace.

## Priority

1. **Situation video** — when `situation.video` resolves, or a drop-in `situations/{id}/{situationId}.mp4` exists in assets
2. **Still PNG** — current Coil path (`image` is still required)
3. **Live2D** — only when Cubism is explicitly enabled (`TOUYA_LIVE2D=1`) **and** there is no situation video

If both a Live2D flag and a situation video exist, **video wins** (Oz card feel). See `resolveChatArtKind` in `SituationArt.kt`. `ChatArtSurface` accepts an optional `live2d` slot so the PR #5 `GLSurfaceView` host can plug in without this feature depending on Core/AAR.

## Folder convention

Same relative path on web and Android:

```
public/situations/{characterId}/{situationId}.png     # required still
public/situations/{characterId}/{situationId}.mp4     # optional loop (web / API)

android/app/src/main/assets/situations/{characterId}/{situationId}.png
android/app/src/main/assets/situations/{characterId}/{situationId}.mp4
```

Catalog field (shared JSON → public `SituationPublic`):

```json
"image": "/situations/hiyori/cafe-rain.png",
"video": "/situations/hiyori/cafe-rain.mp4"
```

- `video` is optional. If present it must be a non-empty path string (`/situations/.../foo.mp4` or `https://…`).
- `image` stays required. PNG-only installs do not need any mp4.
- The build does **not** require video binaries. Do not commit large clips unless you mean to.

Android also accepts a **drop-in without JSON**: put `cafe-rain.mp4` next to the still under `assets/situations/hiyori/` and open ひより. Other situations stay still.

## Generate a 3–5s muted loop

From the situation PNG (Vidu / Runway / local img2vid), then wrap as H.264:

```bash
# already-muted clip, portrait-friendly, short GOP for looping
ffmpeg -y -i input.mp4 -an -t 5 \
  -vf "scale=720:-2:force_original_aspect_ratio=increase,crop=720:1280" \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  android/app/src/main/assets/situations/hiyori/cafe-rain.mp4

cp android/app/src/main/assets/situations/hiyori/cafe-rain.mp4 \
   public/situations/hiyori/cafe-rain.mp4
```

Tips: keep the last frame close to the first so the loop does not pop; no burned-in text (same rule as stills); keep files small (a few MB).

## Test on a Pixel

1. Drop one mp4 at `android/app/src/main/assets/situations/hiyori/cafe-rain.mp4` (or set `video` in `shared/characters/hiyori.json` and deploy `public/…/cafe-rain.mp4` so the API URL resolves).
2. `cd android && ./gradlew :app:installDebug`
3. Open **桃瀬ひより**. Default 雨のカフェ should loop, muted, filling the portrait.
4. Tap another situation chip → still PNG. Tap 雨のカフェ again → video returns.
5. Header / chips / bubbles / input stay on top. SFW/NSFW filtering and unlocks are unchanged.
6. A checkout with **no** mp4 still compiles and shows PNGs.

Web (light mirror): `<video autoplay muted loop playsInline>` when `situation.video` is set; `onError` falls back to the PNG. Roster cards keep stills (`motion={false}`).
