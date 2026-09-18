package jp.touya.app.live2d

/**
 * Fixed in-app roster. Do not turn this into a user-import / marketplace
 * of `.moc3` files — that is the Live2D “Expandable Application” risk.
 */
object Live2dRoster {
    val FIXED_IDS: Set<String> = setOf("hiyori", "clara", "rione", "shiraishi")

    /**
     * Official Cubism Java sample folder that may stand in during the spike.
     * Only ひより maps to the shipped **Hiyori** sample; everyone else stays
     * still until an original model is dropped under `live2d/{id}/`.
     */
    fun sampleFolder(characterId: String): String? = when (characterId) {
        "hiyori" -> "Hiyori"
        else -> null
    }
}

/**
 * Closed list of `.model3.json` paths we will look for. Order is
 * situation-specific original → character original → official sample alias.
 */
fun live2dAssetCandidates(characterId: String, situationId: String): List<String> {
    val id = characterId.trim()
    val scene = situationId.trim()
    if (id.isEmpty() || id !in Live2dRoster.FIXED_IDS) return emptyList()
    val out = mutableListOf<String>()
    if (scene.isNotEmpty()) {
        out += "live2d/$id/$scene/$scene.model3.json"
    }
    out += "live2d/$id/$id.model3.json"
    Live2dRoster.sampleFolder(id)?.let { alias ->
        out += "live2d/$alias/$alias.model3.json"
        // Official Sample/src/main/assets drop-in (folder at assets root).
        out += "$alias/$alias.model3.json"
    }
    return out
}

fun specFromAssetPath(characterId: String, situationId: String, relativePath: String): Live2dModelSpec {
    val slash = relativePath.lastIndexOf('/')
    val dir = if (slash >= 0) relativePath.substring(0, slash + 1) else ""
    val file = if (slash >= 0) relativePath.substring(slash + 1) else relativePath
    return Live2dModelSpec(
        characterId = characterId,
        situationId = situationId,
        assetDir = dir,
        model3Json = file,
    )
}
