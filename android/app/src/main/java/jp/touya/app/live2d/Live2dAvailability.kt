package jp.touya.app.live2d

import android.content.res.AssetManager
import jp.touya.app.BuildConfig

fun live2dSdkPresent(): Boolean = BuildConfig.LIVE2D_SDK_PRESENT

fun live2dFlagOn(): Boolean = BuildConfig.LIVE2D_ENABLED

fun assetExists(assets: AssetManager, relativePath: String): Boolean =
    runCatching { assets.open(relativePath).use { } }.isSuccess

fun findLive2dSpec(
    assets: AssetManager,
    characterId: String,
    situationId: String,
): Live2dModelSpec? {
    for (path in live2dAssetCandidates(characterId, situationId)) {
        if (assetExists(assets, path)) {
            return specFromAssetPath(characterId, situationId, path)
        }
    }
    return null
}

fun resolveChatArt(
    assets: AssetManager,
    characterId: String,
    situationId: String,
): Pair<ChatArtMode, Live2dModelSpec?> {
    val spec = findLive2dSpec(assets, characterId, situationId)
    val mode = resolveChatArtMode(
        Live2dGate(
            sdkPresent = live2dSdkPresent(),
            flagOn = live2dFlagOn(),
            modelPresent = spec != null,
        ),
    )
    return mode to if (mode == ChatArtMode.LIVE2D) spec else null
}
