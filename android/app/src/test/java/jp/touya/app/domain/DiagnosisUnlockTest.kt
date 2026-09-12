package jp.touya.app.domain

import jp.touya.app.data.SituationPublic
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class DiagnosisUnlockTest {
    @Test
    fun diagnosisHasTenQuestionsAndHiyoriPath() {
        assertEquals(10, DIAGNOSIS_QUESTIONS.size)
        val allFirst = DIAGNOSIS_QUESTIONS.map { 0 }
        assertEquals("hiyori", scoreDiagnosis(allFirst).id)
    }

    @Test
    fun diagnosisCanLandOnEachOfTheFour() {
        assertEquals("rione", scoreDiagnosis(DIAGNOSIS_QUESTIONS.map { 1 }).id)
        assertEquals("shiraishi", scoreDiagnosis(DIAGNOSIS_QUESTIONS.map { 2 }).id)
        val claraHeavy = listOf(3, 3, 3, 3, 3, 3, 3, 1, 3, 3)
        assertEquals("clara", scoreDiagnosis(claraHeavy).id)
    }

    @Test
    fun costumesWaitUntilDayThreeExceptDaily() {
        val maid = SituationPublic(id = "maid", title = "メイド", costume = "maid")
        val daily = SituationPublic(id = "cafe", title = "カフェ")
        val september = Instant.parse("2026-09-12T13:00:00Z")
        assertEquals(2, daysUntilUnlock(maid, 1, september))
        assertEquals(1, daysUntilUnlock(maid, 2, september))
        assertNull(daysUntilUnlock(daily, 1, september))
        assertTrue(isSituationUnlocked(daily, 1, september))
    }

    @Test
    fun affinityMinLevelGatesCostumes() {
        val maid = SituationPublic(id = "maid", title = "メイド", costume = "maid", minLevel = 1)
        val halloween = SituationPublic(
            id = "halloween",
            title = "ハロウィン",
            season = "halloween",
            costume = "halloween",
            minLevel = 1,
        )
        val daily = SituationPublic(id = "cafe", title = "カフェ")
        val september = Instant.parse("2026-09-12T13:00:00Z")
        val october = Instant.parse("2026-10-03T03:00:00Z")
        assertEquals(false, isSituationUnlocked(maid, 3, september, 0))
        assertEquals(true, isSituationUnlocked(maid, 3, september, 1))
        assertEquals(false, isSituationUnlocked(halloween, 1, october, 0))
        assertEquals(true, isSituationUnlocked(halloween, 1, october, 1))
        assertEquals(true, isSituationUnlocked(daily, 1, september, 0))
        assertNull(daysUntilUnlock(maid, 3, september, 0))
    }
}
