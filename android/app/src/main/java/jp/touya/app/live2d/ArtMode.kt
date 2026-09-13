package jp.touya.app.live2d

/**
 * Chat portrait mode. Default is still PNGs (Coil). Live2D is opt-in
 * and only used when the Cubism Java SDK is linked, a dev flag is on,
 * and a model exists for that fixed-roster character.
 */
enum class ChatArtMode {
    STILL,
    LIVE2D,
}

data class Live2dGate(
    val sdkPresent: Boolean,
    val flagOn: Boolean,
    val modelPresent: Boolean,
)

fun resolveChatArtMode(gate: Live2dGate): ChatArtMode =
    if (gate.sdkPresent && gate.flagOn && gate.modelPresent) {
        ChatArtMode.LIVE2D
    } else {
        ChatArtMode.STILL
    }

data class Live2dModelSpec(
    val characterId: String,
    val situationId: String,
    /** Asset directory ending with `/`, e.g. `live2d/Hiyori/`. */
    val assetDir: String,
    /** File name inside [assetDir], e.g. `Hiyori.model3.json`. */
    val model3Json: String,
) {
    val model3Path: String get() = assetDir + model3Json
}
