package jp.touya.app.domain

import jp.touya.app.data.SituationPublic
import java.time.Instant

const val COSTUME_UNLOCK_DAYS = 3
const val LOCKED_SITUATION_HINT = "もう少し話そう"
const val LOCKED_INTIMATE_TITLE = "特別な時間"

fun isHalloweenSeason(now: Instant = Instant.now()): Boolean = jstMonth(now) == 10

fun isSituationUnlocked(
    scene: SituationPublic,
    daysMet: Int,
    now: Instant = Instant.now(),
    affinityLevel: Int = 0,
    nsfwAllowed: Boolean = false,
): Boolean {
    if (scene.nsfwOnly && !nsfwAllowed) return false
    if (affinityLevel < scene.minLevel) return false
    if (scene.costume.isNullOrBlank() && scene.season.isNullOrBlank() && !scene.nsfwOnly) return true
    if (scene.nsfwOnly) return true
    if (scene.season == "halloween" && isHalloweenSeason(now)) return true
    return daysMet >= COSTUME_UNLOCK_DAYS
}

fun unlockedSituationIds(
    situations: List<SituationPublic>,
    daysMet: Int,
    now: Instant = Instant.now(),
    affinityLevel: Int = 0,
    nsfwAllowed: Boolean = false,
): List<String> = situations.filter { isSituationUnlocked(it, daysMet, now, affinityLevel, nsfwAllowed) }.map { it.id }

fun daysUntilUnlock(
    scene: SituationPublic,
    daysMet: Int,
    now: Instant = Instant.now(),
    affinityLevel: Int = 0,
    nsfwAllowed: Boolean = false,
): Int? {
    if (isSituationUnlocked(scene, daysMet, now, affinityLevel, nsfwAllowed)) return null
    if (scene.nsfwOnly) return null
    if (affinityLevel < scene.minLevel) return null
    return maxOf(1, COSTUME_UNLOCK_DAYS - daysMet)
}

fun situationLockHint(scene: SituationPublic, affinityLevel: Int = 0): String {
    if (scene.nsfwOnly || scene.minLevel >= NSFW_MIN_AFFINITY_LEVEL) return NSFW_LOCK_HINT
    if (affinityLevel < scene.minLevel) return "もっと仲良くなったら"
    return LOCKED_SITUATION_HINT
}

fun situationChipTitle(scene: SituationPublic, unlocked: Boolean): String =
    if (!unlocked && scene.nsfwOnly) LOCKED_INTIMATE_TITLE else scene.title
