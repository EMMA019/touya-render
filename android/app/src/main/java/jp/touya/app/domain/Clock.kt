package jp.touya.app.domain

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import kotlin.math.abs

val JST: ZoneId = ZoneId.of("Asia/Tokyo")

val DAY_PARTS = listOf("dawn", "morning", "afternoon", "evening", "night")
val WEEKDAYS = listOf("sun", "mon", "tue", "wed", "thu", "fri", "sat")

data class Clock(
    val day: String,
    val hour: Int,
    val month: Int,
    val weekday: String,
    val part: String,
)

fun dayPart(hour: Int): String = when {
    hour < 5 -> "night"
    hour < 9 -> "dawn"
    hour < 12 -> "morning"
    hour < 17 -> "afternoon"
    hour < 21 -> "evening"
    else -> "night"
}

fun jstDayKey(now: Instant = Instant.now()): String =
    now.atZone(JST).toLocalDate().toString()

fun jstHour(now: Instant = Instant.now()): Int = now.atZone(JST).hour

fun jstMonth(now: Instant = Instant.now()): Int = now.atZone(JST).monthValue

fun jstWeekday(now: Instant = Instant.now()): String {
    val value = now.atZone(JST).dayOfWeek.value
    return WEEKDAYS[value % 7]
}

fun readClock(now: Instant = Instant.now()): Clock {
    val hour = jstHour(now)
    return Clock(
        day = jstDayKey(now),
        hour = hour,
        month = jstMonth(now),
        weekday = jstWeekday(now),
        part = dayPart(hour),
    )
}

fun shiftDayKey(day: String, delta: Int): String =
    LocalDate.parse(day).plusDays(delta.toLong()).toString()

fun daysBetween(from: String, to: String): Int =
    ChronoUnit.DAYS.between(LocalDate.parse(from), LocalDate.parse(to)).toInt()

fun streakEndingOn(days: List<String>, end: String): Int {
    val set = days.toSet()
    var count = 0
    var cursor = end
    while (set.contains(cursor)) {
        count += 1
        cursor = shiftDayKey(cursor, -1)
        if (count > 60) break
    }
    return count
}

/** Same 32-bit hash as `src/lib/clock.ts` so Web and Android pick the same line. */
fun hashPick(seed: String, length: Int): Int {
    if (length <= 0) return 0
    var h = 0
    for (ch in seed) {
        h = (h * 33 + ch.code)
    }
    val magnitude = if (h == Int.MIN_VALUE) 2_147_483_648L else abs(h).toLong()
    return (magnitude % length).toInt()
}
