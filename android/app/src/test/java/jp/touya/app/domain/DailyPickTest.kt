package jp.touya.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DailyPickTest {
    @Test
    fun untilNextLabelMatchesWebCopy() {
        assertEquals("あと12で特別", untilNextLabel(12, "特別"))
        assertEquals("あと1で仲良し", untilNextLabel(1, "仲良し"))
        assertNull(untilNextLabel(0, "特別"))
        assertNull(untilNextLabel(null, "特別"))
        assertNull(untilNextLabel(8, "  "))
    }

    @Test
    fun partnerLabelPrefersGivenName() {
        val pick = DailyPick(
            date = "2026-09-13",
            characterId = "hiyori",
            situationId = "cafe-rain",
            title = "雨のカフェ",
            blurb = "ひよりと、雨のカフェ。",
            characterName = "桃瀬 ひより",
            givenName = "ひより",
        )
        assertEquals("ひより", dailyPartnerLabel(pick))
        assertEquals("桃瀬 ひより", dailyPartnerLabel(pick.copy(givenName = "")))
    }
}
