# Situation art (Android assets)

Stills live here as `{characterId}/{situationId}.png` (and legacy SVG placeholders).

Optional Oz-style loop:

```
situations/hiyori/cafe-rain.mp4
```

Drop the file and rebuild — JSON `video` is not required for this convention. Copy the same file to `public/situations/hiyori/cafe-rain.mp4` if the web/API path should serve it.

Do not commit large binaries unless you intend to ship them. See [OZ_SITUATION_VIDEO.md](../../../../OZ_SITUATION_VIDEO.md).
