package jp.touya.app.domain

import jp.touya.app.data.Absences
import jp.touya.app.data.CharacterPresence
import jp.touya.app.data.Streaks
import jp.touya.app.data.TodayLine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PresenceTest {
    private val nightSaturday = Clock(
        day = "2026-09-12",
        hour = 22,
        month = 9,
        weekday = "sat",
        part = "night",
    )

    private val presence = CharacterPresence(
        today = listOf(
            TodayLine("いつもの席。", whenPart = "any"),
            TodayLine("土曜の夜、席はあけてある。", whenPart = "night", weekday = "sat"),
            TodayLine("朝の光。", whenPart = "dawn"),
        ),
        hooks = listOf("また明日、テラスで。"),
        absences = Absences(
            short = listOf("昨日は来なかったね。"),
            few = listOf("数日、空いてた。今日は隣でいい。"),
            week = listOf("しばらく、空いてた。"),
        ),
        streaks = Streaks(
            three = listOf("三日続いてる。"),
            seven = listOf("一週間、来てる。"),
        ),
        suggestionsByStage = mapOf(
            "regular" to listOf("いつもの席でいい？"),
        ),
    )

    @Test
    fun todayLinePrefersNightAndSaturday() {
        val text = pickTodayLine(presence, nightSaturday, "regular", "hiyori:2026-09-12")
        assertEquals("土曜の夜、席はあけてある。", text)
    }

    @Test
    fun sameSeedReturnsSameLine() {
        val a = pickTodayLine(presence, nightSaturday, "familiar", "rione:2026-09-12")
        val b = pickTodayLine(presence, nightSaturday, "familiar", "rione:2026-09-12")
        assertEquals(a, b)
    }

    @Test
    fun openingNoticesThreeDayAbsenceWithoutBlame() {
        val opening = composeOpening(
            id = "shiraishi",
            greeting = "……来たの。",
            welcomeBack = "また来た。",
            presence = presence,
            clock = nightSaturday,
            stage = "familiar",
            daysAway = 4,
            streak = 1,
            firstVisit = false,
        )
        assertEquals("absence", opening.kind)
        assertFalse(Regex("怒|許さ|裏切り").containsMatchIn(opening.text))
        assertTrue(opening.text.contains("数日、空いてた"))
    }

    @Test
    fun hookRecoveryComesBeforeToday() {
        val opening = composeOpening(
            id = "clara",
            greeting = "Bonsoir.",
            welcomeBack = "おかえりなさい。",
            presence = presence,
            clock = nightSaturday,
            stage = "regular",
            daysAway = 1,
            streak = 2,
            hook = "また明日、テラスで。",
            firstVisit = false,
        )
        assertEquals("hook", opening.kind)
        assertTrue(opening.text.contains("テラス"))
    }

    @Test
    fun suggestionsPreferStage() {
        val hints = suggestionsFor(presence, "regular", listOf("fallback"))
        assertEquals(listOf("いつもの席でいい？"), hints)
    }
}
