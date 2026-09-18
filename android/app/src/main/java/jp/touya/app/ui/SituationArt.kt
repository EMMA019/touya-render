package jp.touya.app.ui

import jp.touya.app.data.mediaUrl

/**
 * Map API paths like `/situations/hiyori/cafe-rain.png` (or `.mp4`)
 * to Coil `file:///android_asset/situations/hiyori/cafe-rain.png`.
 */
fun situationAssetModel(imageUrl: String?): String? {
    val rel = situationRelativePath(imageUrl) ?: return null
    return "file:///android_asset/$rel"
}

/** Media3 [asset:///](https://developer.android.com/media/media3) URI for a bundled situation file. */
fun situationMedia3AssetUri(path: String?): String? {
    val rel = situationRelativePath(path) ?: return null
    return "asset:///$rel"
}

fun situationRelativePath(url: String?): String? {
    val raw = url?.trim().orEmpty()
    if (raw.isEmpty()) return null
    if (raw.startsWith("http://") || raw.startsWith("https://")) return null
    val rel = raw.removePrefix("/")
    if (!rel.startsWith("situations/")) return null
    return rel
}

/**
 * Chat art kind. Situation video wins for the Oz card feel.
 * Live2D (PR #5 Cubism shell) only when explicitly enabled **and** no video.
 */
enum class ChatArtKind {
    VIDEO,
    STILL,
    LIVE2D,
}

fun resolveChatArtKind(
    videoResolved: Boolean,
    live2dEligible: Boolean = false,
): ChatArtKind = when {
    videoResolved -> ChatArtKind.VIDEO
    live2dEligible -> ChatArtKind.LIVE2D
    else -> ChatArtKind.STILL
}

/**
 * Resolve a playable situation video URI.
 *
 * 1. Explicit `situation.video` (asset if present, else API / https URL)
 * 2. Convention drop-in: `situations/{characterId}/{situationId}.mp4` in assets
 *
 * Missing files are not an error — PNG-only installs stay on still art.
 */
fun resolveSituationVideoUri(
    explicit: String?,
    characterId: String = "",
    situationId: String = "",
    assetAvailable: (String) -> Boolean = { false },
): String? {
    val explicitTrim = explicit?.trim().orEmpty()
    if (explicitTrim.isNotEmpty()) {
        val rel = situationRelativePath(explicitTrim)
        if (rel != null && assetAvailable(rel)) {
            return situationMedia3AssetUri(explicitTrim)
        }
        if (explicitTrim.startsWith("http://") || explicitTrim.startsWith("https://")) {
            return explicitTrim
        }
        if (rel != null) {
            return mediaUrl(explicitTrim)
        }
        val rawRel = explicitTrim.removePrefix("/")
        if (rawRel.startsWith("situations/") && assetAvailable(rawRel)) {
            return "asset:///$rawRel"
        }
        return null
    }
    val id = characterId.trim()
    val scene = situationId.trim()
    if (id.isEmpty() || scene.isEmpty()) return null
    val convention = "situations/$id/$scene.mp4"
    if (assetAvailable(convention)) return "asset:///$convention"
    return null
}
