package jp.touya.app.ui

/**
 * Map API image URL like `/situations/hiyori/cafe-rain.png`
 * to Coil `file:///android_asset/situations/hiyori/cafe-rain.png`.
 */
fun situationAssetModel(imageUrl: String?): String? {
    val raw = imageUrl?.trim().orEmpty()
    if (raw.isEmpty()) return null
    val rel = raw.removePrefix("/")
    if (!rel.startsWith("situations/")) return null
    return "file:///android_asset/$rel"
}
