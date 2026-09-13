package jp.touya.app.domain

import jp.touya.app.data.AffinityPublic
import jp.touya.app.data.CharacterPublic
import jp.touya.app.data.SituationPublic
import java.time.Instant

enum class ShelfTab(val id: String, val label: String) {
    ALL("all", "すべて"),
    DAILY("daily", "日常"),
    MAID("maid", "メイド"),
    NURSE("nurse", "ナース"),
    MIKO("miko", "巫女"),
    IDOL("idol", "アイドル"),
    HALLOWEEN("halloween", "ハロウィン"),
    SFW("sfw", "SFW"),
}

data class ShelfCard(
    val key: String,
    val character: CharacterPublic,
    val situation: SituationPublic,
    val title: String,
    val givenName: String,
    val image: String?,
    val locked: Boolean,
    val lockHint: String?,
    val nsfwOnly: Boolean,
    val affinity: AffinityPublic,
)

fun givenName(name: String): String {
    val part = name.trim().split(Regex("\\s+")).lastOrNull().orEmpty()
    return part.ifBlank { name }
}

fun canRevealIntimate(affinityLevel: Int): Boolean = affinityLevel >= NSFW_MIN_AFFINITY_LEVEL

fun isDailySituation(scene: SituationPublic): Boolean =
    scene.costume.isNullOrBlank() && scene.season.isNullOrBlank() && !scene.nsfwOnly

/** Costume/season rows only have generated 390×844 stub rasters. Hide those from the shelf. */
fun hasFinishedSituationArt(scene: SituationPublic): Boolean {
    if (!scene.costume.isNullOrBlank() || !scene.season.isNullOrBlank()) return false
    return !scene.image.isNullOrBlank() || !scene.video.isNullOrBlank()
}

fun matchesShelfTab(scene: SituationPublic, tab: ShelfTab): Boolean = when (tab) {
    ShelfTab.ALL -> true
    ShelfTab.SFW -> !scene.nsfwOnly
    ShelfTab.DAILY -> isDailySituation(scene)
    ShelfTab.HALLOWEEN -> scene.season == "halloween" || scene.costume == "halloween"
    ShelfTab.MAID -> scene.costume == "maid"
    ShelfTab.NURSE -> scene.costume == "nurse"
    ShelfTab.MIKO -> scene.costume == "miko"
    ShelfTab.IDOL -> scene.costume == "idol"
}

fun visibleShelfTabs(roster: List<CharacterPublic>): List<ShelfTab> =
    ShelfTab.entries.filter { tab ->
        tab == ShelfTab.ALL || tab == ShelfTab.SFW ||
            roster.any { character ->
                character.situations.any { matchesShelfTab(it, tab) && hasFinishedSituationArt(it) }
            }
    }

fun collectShelfCards(
    roster: List<CharacterPublic>,
    characterId: String? = null,
    tab: ShelfTab = ShelfTab.ALL,
    now: Instant = Instant.now(),
): List<ShelfCard> {
    val cards = mutableListOf<ShelfCard>()
    for (character in roster) {
        if (!characterId.isNullOrBlank() && character.id != characterId) continue
        val affinity = character.affinity
        val nsfwAllowed = canRevealIntimate(affinity.level)
        val unlockedIds = character.unlocked
        for (scene in character.situations) {
            if (!matchesShelfTab(scene, tab)) continue
            if (!hasFinishedSituationArt(scene) && !scene.nsfwOnly) continue
            val unlocked = if (unlockedIds.isNotEmpty()) {
                scene.id in unlockedIds
            } else {
                isSituationUnlocked(scene, 0, now, affinity.level, nsfwAllowed)
            }
            val hideArt = scene.nsfwOnly && !unlocked
            cards += ShelfCard(
                key = "${character.id}:${scene.id}",
                character = character,
                situation = scene,
                title = if (hideArt) LOCKED_INTIMATE_TITLE else scene.title,
                givenName = givenName(character.name),
                image = if (hideArt) null else (scene.image ?: character.portraitImage),
                locked = !unlocked,
                lockHint = if (unlocked) {
                    null
                } else if (scene.nsfwOnly) {
                    LOCKED_INTIMATE_HINT
                } else {
                    situationLockHint(scene, affinity.level)
                },
                nsfwOnly = scene.nsfwOnly,
                affinity = affinity,
            )
        }
    }
    return cards
}

fun mediaForShelf(card: ShelfCard): String? {
    if (card.image.isNullOrBlank()) return null
    return jp.touya.app.data.mediaUrl(card.image)
}
