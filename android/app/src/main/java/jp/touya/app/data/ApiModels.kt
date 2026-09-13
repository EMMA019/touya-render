package jp.touya.app.data

import jp.touya.app.domain.ModePublic

data class Palette(
    val from: String,
    val to: String,
    val glow: String,
    val hair: String,
    val accent: String,
)

data class TodayLine(
    val text: String,
    val whenPart: String? = null,
    val weekday: String? = null,
    val month: Int? = null,
    val stage: String? = null,
)

data class Absences(
    val short: List<String> = emptyList(),
    val few: List<String> = emptyList(),
    val week: List<String> = emptyList(),
)

data class Streaks(
    val three: List<String> = emptyList(),
    val seven: List<String> = emptyList(),
)

data class CharacterPresence(
    val today: List<TodayLine> = emptyList(),
    val hooks: List<String> = emptyList(),
    val absences: Absences = Absences(),
    val streaks: Streaks = Streaks(),
    val suggestionsByStage: Map<String, List<String>> = emptyMap(),
)

data class Opening(
    val kind: String,
    val text: String,
)

data class Bond(
    val daysMet: Int = 0,
    val factCount: Int = 0,
    val stage: String = "first",
    val lastDay: String? = null,
    val firstDay: String? = null,
    val streak: Int = 0,
    val daysAway: Int = 0,
)

val EMPTY_BOND = Bond()

val BOND_LABEL = mapOf(
    "first" to "初対面",
    "familiar" to "顔なじみ",
    "regular" to "常連",
)

data class AffinityPublic(
    val count: Int = 0,
    val level: Int = 0,
    val name: String = "知り合い",
    val nextAt: Int? = 10,
    val progress: Float = 0f,
)

private data class AffinityLevel(val level: Int, val name: String, val at: Int)

private val AFFINITY_LEVELS = listOf(
    AffinityLevel(0, "知り合い", 0),
    AffinityLevel(1, "仲良し", 10),
    AffinityLevel(2, "特別", 30),
    AffinityLevel(3, "絆", 60),
)

fun levelFromCount(count: Int): AffinityPublic {
    val n = maxOf(0, count)
    var current = AFFINITY_LEVELS.first()
    for (row in AFFINITY_LEVELS) {
        if (n >= row.at) current = row
    }
    val next = AFFINITY_LEVELS.firstOrNull { it.level == current.level + 1 }
        ?: return AffinityPublic(count = n, level = current.level, name = current.name, nextAt = null, progress = 1f)
    val span = maxOf(1, next.at - current.at)
    val into = minOf(span, maxOf(0, n - current.at))
    return AffinityPublic(
        count = n,
        level = current.level,
        name = current.name,
        nextAt = next.at,
        progress = into.toFloat() / span.toFloat(),
    )
}

val EMPTY_AFFINITY = levelFromCount(0)

data class MemoryRow(
    val kind: String,
    val text: String,
    val at: String = "",
)

data class CompanionSnapshot(
    val bond: Bond = EMPTY_BOND,
    val memory: List<MemoryRow> = emptyList(),
    val unlocked: List<String> = emptyList(),
    val affinity: AffinityPublic = EMPTY_AFFINITY,
)

data class CharacterBwh(
    val bust: Int,
    val waist: Int,
    val hip: Int,
)

fun formatBwh(bwh: CharacterBwh?): String? =
    bwh?.let { "B${it.bust} / W${it.waist} / H${it.hip}" }

fun mediaUrl(path: String?): String? {
    if (path.isNullOrBlank()) return null
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    return jp.touya.app.BuildConfig.API_BASE_URL.trimEnd('/') + path
}

data class CharacterPublic(
    val id: String,
    val name: String,
    val reading: String,
    val job: String,
    val tagline: String,
    val greeting: String,
    val welcomeBack: String = "",
    val farewell: String = "",
    val offline: String = "",
    val tone: String,
    val artStyle: String = "anime",
    val suggestions: List<String>,
    val situations: List<SituationPublic> = emptyList(),
    val palette: Palette,
    val portraitImage: String? = null,
    val presence: CharacterPresence? = null,
    val bwh: CharacterBwh? = null,
    val affinity: AffinityPublic = EMPTY_AFFINITY,
) {
    fun rosterArt(): String? = mediaUrl(portraitImage ?: situations.firstOrNull()?.image)

    fun situationArt(situationId: String): String? =
        mediaUrl(situations.firstOrNull { it.id == situationId }?.image ?: portraitImage)
}

data class SituationLine(
    val text: String,
    val minLevel: Int = 0,
)

data class SituationPublic(
    val id: String,
    val title: String,
    val image: String? = null,
    val season: String? = null,
    val costume: String? = null,
    val greeting: String? = null,
    val lines: List<SituationLine> = emptyList(),
    val minLevel: Int = 0,
)

fun situationGreeting(situation: SituationPublic?, fallback: String): String {
    val line = situation?.greeting?.trim().orEmpty()
    return line.ifBlank { fallback }
}

fun seedSituationGreeting(
    messages: List<ChatMessage>,
    situationId: String,
    greeting: String,
): List<ChatMessage> {
    val text = greeting.trim()
    if (text.isEmpty() || situationId.isBlank()) return messages
    val bubble = ChatMessage("assistant", text, id = "situation-$situationId")
    val hasUser = messages.any { it.role == "user" }
    if (!hasUser) return listOf(bubble)
    val last = messages.lastOrNull()
    if (last?.id == bubble.id) return messages
    if (last?.role == "assistant" && last.id.startsWith("situation-")) {
        return messages.dropLast(1) + bubble
    }
    return messages + bubble
}

fun situationCardLines(situation: SituationPublic?, level: Int = 0): List<String> =
    (situation?.lines.orEmpty())
        .filter { it.minLevel <= level }
        .map { it.text.trim() }
        .filter { it.isNotBlank() }
        .take(3)

data class Quota(
    val used: Int,
    val limit: Int,
    val remaining: Int,
    val day: String = "",
    val extra: Int = 0,
    val premium: Boolean = false,
    val rewardsLeft: Int = 2,
    val debugUnlimited: Boolean = false,
)

val EMPTY_MODE = ModePublic()

data class SessionSnapshot(
    val quota: Quota,
    val mode: ModePublic = EMPTY_MODE,
)

data class ChatMessage(
    val role: String,
    val content: String,
    val pending: Boolean = false,
    val id: String = "",
)

data class TtsAudio(
    val bytes: ByteArray,
    val mime: String,
)
