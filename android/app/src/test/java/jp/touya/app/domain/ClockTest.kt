package jp.touya.app.domain

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant

class ClockTest {
    @Test
    fun dayPartMapsJapanHours() {
        assertEquals("night", dayPart(3))
        assertEquals("dawn", dayPart(7))
        assertEquals("morning", dayPart(10))
        assertEquals("afternoon", dayPart(15))
        assertEquals("evening", dayPart(19))
        assertEquals("night", dayPart(22))
    }

    @Test
    fun readClockIsJapanLocalOnSaturdayNight() {
        val clock = readClock(Instant.parse("2026-09-12T13:00:00.000Z"))
        assertEquals("2026-09-12", clock.day)
        assertEquals("sat", clock.weekday)
        assertEquals("night", clock.part)
        assertEquals(22, clock.hour)
        assertEquals(9, clock.month)
    }

    @Test
    fun streakCountsConsecutiveJstDaysOnly() {
        assertEquals(3, daysBetween("2026-09-10", "2026-09-13"))
        assertEquals("2026-09-12", shiftDayKey("2026-09-13", -1))
        assertEquals(3, streakEndingOn(listOf("2026-09-11", "2026-09-12", "2026-09-13"), "2026-09-13"))
        assertEquals(1, streakEndingOn(listOf("2026-09-10", "2026-09-13"), "2026-09-13"))
    }

    @Test
    fun hashPickMatchesWebClockTs() {
        assertEquals(hashPick("rione:2026-09-12", 8), hashPick("rione:2026-09-12", 8))
        assertEquals(2, hashPick("hiyori:2026-09-12", 8))
        assertEquals(7, hashPick("rione:2026-09-12", 8))
        assertEquals(2, hashPick("shiraishi:2026-09-12", 8))
        assertEquals(3, hashPick("clara:2026-09-12", 8))
        assertEquals(1, hashPick("clara-hook", 6))
    }
}
