# Live2D Cubism SDK for Java（燈夜）

Official **Cubism SDK for Java** path — not Unity. Chat still uses Coil PNGs unless you drop the SDK in and turn the spike on.

The roster stays **fixed** (hiyori / clara / rione / shiraishi). Do not add user-import avatars, a model marketplace, or an “any `.moc3`” hub. That is the Live2D **Expandable Application** case.

## License (read before downloading)

- Download and local development: free after you agree to Live2D’s licenses on the download page.
- [Cubism SDK for Java](https://www.live2d.com/en/sdk/download/java/) (JP: [download-java](https://www.live2d.com/sdk/download/java/))
- [Publication / SDK Release License](https://www.live2d.com/en/sdk/license/) — individuals and small enterprises (annual sales under **¥10 million**) are usually exempt from publication fees **except Expandable Applications**.
- [Expandable Applications](https://www.live2d.com/en/sdk/license/expandable/) — user-generated / unlimited models, avatar generators, collections, portals. Those need a special review even for individuals. Touya avoids this by shipping a **closed four-character roster** and situation art we author.
- **Core** (`Live2DCubismCore.aar`) is Live2D Proprietary Software. **Do not commit the AAR.**
- **Framework** is [CubismJavaFramework](https://github.com/Live2D/CubismJavaFramework) (Live2D Open Software License). We copy it locally; we do not vendor it in git so the tree stays aligned with *your* SDK zip.
- Sample models (Haru / Hiyori / …) have their own material license. Do not invent fake `.moc3` files. Do not commit the sample binaries.

Confirm current terms on live2d.com — this file is a map, not legal advice.

## What the app does without the SDK

`:app:compileDebugKotlin` works on a clean checkout. Chat shows the existing still PNG / Coil path. `BuildConfig.LIVE2D_SDK_PRESENT` is `false`.

## Drop-in layout

Download **Cubism SDK for Java** (the zip, not Unity). Official sample layout:

```
CubismSdkForJava-*/
  Core/android/Live2DCubismCore.aar
  Framework/framework/src/main/java/com/live2d/sdk/cubism/...
  Sample/src/main/assets/Hiyori/Hiyori.model3.json
```

GitHub mirrors (Framework + samples; Core is still only in the zip):

- [CubismJavaSamples](https://github.com/Live2D/CubismJavaSamples)
- [CubismJavaFramework](https://github.com/Live2D/CubismJavaFramework)
- Core copy notes: [CubismJavaSamples README](https://github.com/Live2D/CubismJavaSamples#live2d-cubism-core-for-java)

Copy into this repo (**gitignored**):

```bash
# from android/
mkdir -p app/libs live2d/Core/android

# 1) Proprietary Core
cp /path/to/CubismSdkForJava-*/Core/android/Live2DCubismCore.aar app/libs/
# or:
# cp /path/to/CubismSdkForJava-*/Core/android/Live2DCubismCore.aar live2d/Core/android/

# 2) Framework sources (official module layout)
cp -R /path/to/CubismSdkForJava-*/Framework live2d/

# 3) Official sample model — Hiyori (idle + blink in the sample)
mkdir -p app/src/main/assets/live2d
cp -R /path/to/CubismSdkForJava-*/Sample/src/main/assets/Hiyori \
      app/src/main/assets/live2d/
# or keep the official assets tree:
# cp -R /path/to/CubismSdkForJava-*/Sample live2d/
```

Gradle looks for:

| Piece | Accepted paths |
| --- | --- |
| Core AAR | `android/app/libs/Live2DCubismCore.aar` or `android/live2d/Core/android/Live2DCubismCore.aar` |
| Framework Java | `android/live2d/Framework/framework/src/main/java` or `android/live2d/Framework/src/main/java` |
| Sample assets | `android/app/src/main/assets/live2d/Hiyori/`, `android/live2d/samples/`, or `android/live2d/Sample/src/main/assets/` |

When Core **and** Framework are both present, the app compiles `src/live2d/` (real `com.live2d.sdk.cubism.*` host) instead of `src/live2dStub/`.

## Enable the spike on a Pixel

Still art stays the default even after the SDK is linked. Turn Live2D on at **build** time:

```bash
cd android
# one-shot
TOUYA_LIVE2D=1 ./gradlew :app:installDebug

# or add to android/local.properties or a *local* gradle.properties (do not commit):
# touya.live2d=true
```

Then open **桃瀬ひより**. If `Hiyori.model3.json` is on the asset path above, chat uses `GLSurfaceView` (EGL 2, continuous render) instead of Coil. Clara / 凛音 / 白石 stay on still PNGs until you add an original model under `live2d/{id}/`.

If initialize/draw throws, chat falls back to the still PNG.

## Runtime rules

Live2D is shown only when **all** of these are true:

1. `BuildConfig.LIVE2D_SDK_PRESENT` — Core AAR + Framework sources were on disk at compile time
2. `BuildConfig.LIVE2D_ENABLED` — `TOUYA_LIVE2D=1` or `-Ptouya.live2d=true`
3. A `.model3.json` exists for that **fixed** character (see `live2dAssetCandidates`)

Search order (closed list, not a scan of all assets):

1. `live2d/{id}/{situationId}/{situationId}.model3.json`
2. `live2d/{id}/{id}.model3.json`
3. `live2d/Hiyori/Hiyori.model3.json` (ひより spike only)
4. `Hiyori/Hiyori.model3.json` (official sample drop at assets root)

## Compose / lifecycle

- `ChatArtSurface` is the single chat art slot (`ChatScreen` used to call `AsyncImage` here).
- Live2D: `AndroidView` → `GLSurfaceView` → EGL 2 → `RENDERMODE_CONTINUOUSLY`.
- Cubism: `CubismFramework.startUp` → `initialize` on `onSurfaceCreated` → `dispose` / `cleanUp` on view release. See [Framework init/close (Java)](https://docs.live2d.com/en/cubism-sdk-manual/framework-init-close-java/).
- Spike model host: idle motion named `Idle` if present, `CubismEyeBlink` + `CubismBreath`. Written against Cubism **5.x** Java (`CubismRendererAndroid.create(width, height)`). If your zip is older and compile fails, align Framework to the same vintage or adjust `src/live2d/java`.

## Next step (first original model)

Replace the Hiyori *sample* with a ひより model you author in Cubism Editor:

1. Export `.model3.json` + `.moc3` + textures + Idle / blink settings.
2. Put them at `app/src/main/assets/live2d/hiyori/` (and later `live2d/hiyori/{situation}/` per costume).
3. Keep still PNGs for every situation — they remain the default and the fallback.
4. Do not add an import picker.

## Docs

- [Cubism SDK for Java](https://docs.live2d.com/en/cubism-sdk-manual/cubism-sdk-for-java/)
- [Use Framework directly](https://docs.live2d.com/en/cubism-sdk-manual/use-framework-java/)
- [Android sample run](https://docs.live2d.com/en/cubism-sdk-tutorials/android-sample-run/)
