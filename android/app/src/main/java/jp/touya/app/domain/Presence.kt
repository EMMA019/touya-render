package jp.touya.app.domain

import jp.touya.app.data.CharacterPresence
import jp.touya.app.data.Opening
import jp.touya.app.data.TodayLine

fun matches(line: TodayLine, clock: Clock, stage: String): Boolean {
    if (line.whenPart != null && line.whenPart != "any" && line.whenPart != clock.part) return false
    if (line.weekday != null && line.weekday != clock.weekday) return false
    if (line.month != null && line.month != clock.month) return false
    if (line.stage != null && line.stage != "any" && line.stage != stage) return false
    return true
}

fun specificity(line: TodayLine): Int =
    (if (line.whenPart != null && line.whenPart != "any") 2 else 0) +
        (if (line.weekday != null) 2 else 0) +
        (if (line.month != null) 2 else 0) +
        (if (line.stage != null && line.stage != "any") 1 else 0)

fun pickTodayLine(
    presence: CharacterPresence?,
    clock: Clock,
    stage: String,
    seed: String,
): String? {
    val pool = (presence?.today ?: emptyList()).filter { matches(it, clock, stage) }
    if (pool.isEmpty()) return presence?.today?.firstOrNull()?.text
    val best = pool.maxOf { specificity(it) }
    val tight = pool.filter { specificity(it) == best }
    return tight.getOrNull(hashPick(seed, tight.size))?.text ?: tight.first().text
}

fun pickFrom(list: List<String>?, seed: String, fallback: String): String {
    if (list.isNullOrEmpty()) return fallback
    return list.getOrNull(hashPick(seed, list.size)) ?: fallback
}

fun pickAbsence(presence: CharacterPresence?, daysAway: Int, seed: String, fallback: String): String {
    val absences = presence?.absences
    return when {
        daysAway >= 7 -> pickFrom(absences?.week, seed, fallback)
        daysAway >= 3 -> pickFrom(absences?.few, seed, fallback)
        else -> pickFrom(absences?.short, seed, fallback)
    }
}

fun composeOpening(
    id: String,
    greeting: String,
    welcomeBack: String,
    presence: CharacterPresence?,
    clock: Clock,
    stage: String,
    daysAway: Int,
    streak: Int,
    hook: String? = null,
    firstVisit: Boolean,
): Opening {
    val seed = "$id:${clock.day}"
    val today = pickTodayLine(presence, clock, stage, seed)
        ?: if (firstVisit) greeting else welcomeBack

    if (firstVisit) {
        return Opening(
            kind = "first",
            text = if (today == greeting) greeting else "$greeting\n$today",
        )
    }

    if (daysAway >= 2) {
        val noticed = pickAbsence(presence, daysAway, seed, welcomeBack)
        return Opening(kind = "absence", text = "$noticed\n$today")
    }

    if (!hook.isNullOrBlank()) {
        return Opening(
            kind = "hook",
            text = "$welcomeBack\n昨日の続き、覚えてる。$hook\n$today",
        )
    }

    if (streak >= 7) {
        val line = pickFrom(presence?.streaks?.seven, seed, today)
        return Opening(kind = "streak", text = "$line\n$today")
    }
    if (streak >= 3) {
        val line = pickFrom(presence?.streaks?.three, seed, today)
        return Opening(kind = "streak", text = "$line\n$today")
    }

    if (daysAway >= 1) {
        return Opening(kind = "return", text = today)
    }

    return Opening(kind = "today", text = today)
}

fun suggestionsFor(
    presence: CharacterPresence?,
    stage: String,
    fallback: List<String>,
): List<String> {
    val staged = presence?.suggestionsByStage?.get(stage)
    return if (!staged.isNullOrEmpty()) staged else fallback
}

fun pickHook(presence: CharacterPresence?, seed: String, fallback: String): String =
    pickFrom(presence?.hooks, seed, fallback)
