package jp.touya.app.domain

import jp.touya.app.data.SituationPublic
import java.time.Instant

/**
 * Mirror of src/lib/situation-unlock.ts. Display fallback only — the server's
 * `unlocked` / `locks` from GET /api/companion are the truth.
 *
 * Situations open by affinity band + story flags. The "costume opens after 3
 * met days" gacha is gone; `bond.daysMet` no longer touches unlocks.
 *
 *   帯0 知り合い  daily SFW scenes                 → B1 (Ch0 cleared)
 *   帯1 仲良し    maid / nurse / halloween         → effectiveLevel >= 1 (B3)
 *   帯2 特別      miko / idol / nsfwOnly (default) → effectiveLevel >= 2 (B4); nsfwOnly also needs NSFW mode
 *   帯3 絆        nsfwOnly with minLevel 3         → effectiveLevel >= 3 (B5)
 *   season        halloween scenes only open in October (JST); the band still applies
 */

/** Intimate / nsfwOnly scenes never open below 特別. Same value as the server. */
const val NSFW_MIN_AFFINITY_LEVEL = 2

val COSTUME_BAND: Map<String, Int> = mapOf(
    "maid" to 1,
    "nurse" to 1,
    "halloween" to 1,
    "miko" to 2,
    "idol" to 2,
)

/** Flag a chapter's end sets; also the flag that admits its band. Index = band. */
val ENTRY_FLAG: List<String> = listOf("B1", "B3", "B4", "B5")

val AFFINITY_BAND_NAMES: List<String> = listOf("知り合い", "仲良し", "特別", "絆")

val LOCKED_HINT: Map<String, String> = mapOf(
    "band" to "もう少し話そう",
    "chapter" to "続きを見てから",
    "flag" to "もう少し話そう",
    "season" to "今は季節じゃない",
    "mode" to "NSFWモードで",
)

const val LOCKED_SITUATION_HINT = "もう少し話そう"

data class UnlockContext(
    val flags: List<String>,
    /** -1 before Ch0, else 0..3 */
    val effectiveLevel: Int,
    val pendingChapter: Int? = null,
    val nsfwAllowed: Boolean = false,
    val now: Instant = Instant.now(),
)

/** SSR-equivalent fallback while /api/companion has not answered: the 知り合い band. */
val OPTIMISTIC_UNLOCK = UnlockContext(flags = listOf("B1"), effectiveLevel = 0)

fun isHalloweenSeason(now: Instant = Instant.now()): Boolean = jstMonth(now) == 10

/** Affinity level a scene needs. JSON minLevel overrides the costume band; nsfwOnly floors at 特別. */
fun situationRequiredLevel(scene: SituationPublic): Int {
    val explicit = scene.minLevel.takeIf { scene.minLevelExplicit }
    val band = when {
        !scene.costume.isNullOrBlank() -> COSTUME_BAND[scene.costume] ?: 1
        !scene.season.isNullOrBlank() -> 1
        else -> 0
    }
    val base = explicit ?: band
    return if (scene.nsfwOnly) maxOf(base, NSFW_MIN_AFFINITY_LEVEL) else base
}

fun requiredFlags(scene: SituationPublic): List<String> {
    val level = minOf(3, situationRequiredLevel(scene))
    return (listOf("B1", ENTRY_FLAG[level]) + scene.requires).distinct()
}

private fun inSeason(scene: SituationPublic, now: Instant): Boolean {
    if (scene.season.isNullOrBlank()) return true
    if (scene.season == "halloween") return isHalloweenSeason(now)
    return true
}

/** "open" | "band" | "chapter" | "flag" | "season" | "mode" — same strings as the server `locks` map. */
fun unlockReason(scene: SituationPublic, ctx: UnlockContext): String {
    if (!inSeason(scene, ctx.now)) return "season"
    val need = situationRequiredLevel(scene)
    if (ctx.effectiveLevel < need) {
        return if (ctx.pendingChapter == need) "chapter" else "band"
    }
    if (requiredFlags(scene).any { it !in ctx.flags }) return "flag"
    if (scene.nsfwOnly && !ctx.nsfwAllowed) return "mode"
    return "open"
}

fun isSituationUnlocked(scene: SituationPublic, ctx: UnlockContext): Boolean =
    unlockReason(scene, ctx) == "open"

fun unlockedSituationIds(situations: List<SituationPublic>, ctx: UnlockContext): List<String> =
    situations.filter { isSituationUnlocked(it, ctx) }.map { it.id }

fun situationLocks(situations: List<SituationPublic>, ctx: UnlockContext): Map<String, String> =
    situations.mapNotNull { scene ->
        val reason = unlockReason(scene, ctx)
        if (reason == "open") null else scene.id to reason
    }.toMap()

/** Chip label for a locked scene. Names the band for band locks; never a number. */
fun situationLockHint(scene: SituationPublic, ctx: UnlockContext): String {
    val reason = unlockReason(scene, ctx)
    if (reason == "open") return ""
    if (reason == "band" && ctx.effectiveLevel >= 0) {
        val name = AFFINITY_BAND_NAMES.getOrElse(situationRequiredLevel(scene)) { AFFINITY_BAND_NAMES.last() }
        return "${name}になったら"
    }
    return LOCKED_HINT[reason] ?: LOCKED_SITUATION_HINT
}

/** Hint from the server `locks` reason string (preferred when the server answered). */
fun lockHintFor(reason: String?, scene: SituationPublic, ctx: UnlockContext?): String {
    if (reason == "band" && ctx != null && ctx.effectiveLevel >= 0) return situationLockHint(scene, ctx)
    return LOCKED_HINT[reason] ?: LOCKED_SITUATION_HINT
}
