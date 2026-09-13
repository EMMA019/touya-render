# Dummy situation art removed

Costume / seasonal shelf cards were generated 390×844 SVG rasters (~23–28 KB PNG). Daily scenes and portraits are real JPEGs stored as `.png` (230–500 KB).

The shelf and daily pick now keep **only finished art**. Costume rows stay in character JSON (for later real costumes) but:

- are hidden from the card shelf and costume tabs
- are not featured as 今日のカード
- are omitted from chat situation chips
- fall back to the character portrait if something still asks for their image

`scripts/generate-situation-portraits.mjs` no longer writes costume/season stubs.

## Deleted stub files (web + Android assets)

Same basename under `public/situations/` and `android/app/src/main/assets/situations/`:

| Character | Removed (`.png` + `.svg`) |
| --- | --- |
| ひより | `halloween-witch`, `maid`, `nurse`, `miko` |
| 凛音 | `halloween-vampire`, `maid`, `nurse`, `idol` |
| 白石 | `halloween-rooftop`, `maid`, `nurse` |
| クララ | `halloween-masquerade`, `maid`, `nurse`, `miko` |

JSON `image` for those rows now points at `/situations/{id}/portrait.png`.

## Kept (real art)

| Character | Files |
| --- | --- |
| ひより | `portrait`, `cafe-rain`, `rainy-walk` |
| 凛音 | `portrait`, `office-after`, `bookstore` |
| 白石 | `portrait`, `rooftop-night`, `park-bench` |
| クララ | `portrait`, `penthouse-dusk`, `mansion-library` |
