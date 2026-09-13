package jp.touya.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AffinityTest {
    @Test
    fun levelFromCountMatchesSharedThresholds() {
        val zero = levelFromCount(0)
        assertEquals(0, zero.level)
        assertEquals("知り合い", zero.name)
        assertEquals(10, zero.nextAt)
        assertEquals(0f, zero.progress, 0.0001f)
        assertEquals(10, zero.remainingToNext)

        val nine = levelFromCount(9)
        assertEquals(0, nine.level)
        assertEquals("知り合い", nine.name)
        assertEquals(10, nine.nextAt)
        assertEquals(0.9f, nine.progress, 0.0001f)

        val ten = levelFromCount(10)
        assertEquals(1, ten.level)
        assertEquals("仲良し", ten.name)
        assertEquals(30, ten.nextAt)
        assertEquals(0f, ten.progress, 0.0001f)

        val sixty = levelFromCount(60)
        assertEquals(3, sixty.level)
        assertEquals("絆", sixty.name)
        assertNull(sixty.nextAt)
        assertEquals(1f, sixty.progress, 0.0001f)
    }

    @Test
    fun situationCardHidesObjectLinesBelowMinLevel() {
        val scene = SituationPublic(
            id = "cafe",
            title = "カフェ",
            lines = listOf(
                SituationLine("雨の音、一緒に聴こう。"),
                SituationLine("席、あけておいた。"),
                SituationLine("続きは、もう少し話してから。", minLevel = 2),
            ),
        )
        assertEquals(
            listOf("雨の音、一緒に聴こう。", "席、あけておいた。"),
            situationCardLines(scene, 0),
        )
        assertEquals(3, situationCardLines(scene, 2).size)
    }
}
