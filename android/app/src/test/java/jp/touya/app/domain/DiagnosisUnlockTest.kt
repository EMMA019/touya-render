package jp.touya.app.domain

import jp.touya.app.data.ChatMessage
import jp.touya.app.data.SituationPublic
import jp.touya.app.data.StoryBeat
import jp.touya.app.data.StoryChoice
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** Mirrors src/lib/situation-unlock.test.ts and story-runner.test.ts. */
class DiagnosisUnlockTest {
    private val daily = SituationPublic(id = "cafe-rain", title = "雨のカフェ")
    private val maid = SituationPublic(id = "maid", title = "メイド", costume = "maid")
    private val nurse = SituationPublic(id = "nurse", title = "ナース", costume = "nurse", minLevel = 1, minLevelExplicit = true)
    private val halloween = SituationPublic(
        id = "halloween",
        title = "ハロウィン",
        season = "halloween",
        costume = "halloween",
        minLevel = 1,
        minLevelExplicit = true,
    )
    private val miko = SituationPublic(id = "miko", title = "巫女", costume = "miko")
    private val idol = SituationPublic(id = "idol", title = "アイドル", costume = "idol", minLevel = 2, minLevelExplicit = true)
    private val lateNight = SituationPublic(id = "late-night", title = "夜更け", nsfwOnly = true)
    private val bondNight = SituationPublic(id = "bond-night", title = "絆の夜", nsfwOnly = true, minLevel = 3, minLevelExplicit = true)

    private val september = Instant.parse("2026-09-12T03:00:00Z")
    private val october = Instant.parse("2026-10-03T03:00:00Z")

    private fun ctx(level: Int, pending: Int? = null, nsfw: Boolean = false, now: Instant = september): UnlockContext {
        val flags = buildList {
            if (level >= 0) add("B1")
            if (level >= 1) add("B3")
            if (level >= 2) add("B4")
            if (level >= 3) add("B5")
        }
        return UnlockContext(flags = flags, effectiveLevel = level, pendingChapter = pending, nsfwAllowed = nsfw, now = now)
    }

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
    fun bandsMatchTheServerTable() {
        assertEquals(0, situationRequiredLevel(daily))
        assertEquals(1, situationRequiredLevel(maid))
        assertEquals(1, situationRequiredLevel(nurse))
        assertEquals(1, situationRequiredLevel(halloween))
        assertEquals(2, situationRequiredLevel(miko))
        assertEquals(2, situationRequiredLevel(idol))
        assertEquals(NSFW_MIN_AFFINITY_LEVEL, situationRequiredLevel(lateNight))
        assertEquals(3, situationRequiredLevel(bondNight))
        assertEquals(2, NSFW_MIN_AFFINITY_LEVEL)
        assertEquals(mapOf("maid" to 1, "nurse" to 1, "halloween" to 1, "miko" to 2, "idol" to 2), COSTUME_BAND)
        assertEquals(listOf("B1"), requiredFlags(daily))
        assertEquals(listOf("B1", "B3"), requiredFlags(maid))
        assertEquals(listOf("B1", "B4"), requiredFlags(miko))
    }

    @Test
    fun metDaysAreGoneCostumesOpenByBand() {
        assertTrue(isSituationUnlocked(daily, ctx(0)))
        assertFalse(isSituationUnlocked(maid, ctx(0)))
        assertTrue(isSituationUnlocked(maid, ctx(1)))
        assertFalse(isSituationUnlocked(miko, ctx(1)))
        assertTrue(isSituationUnlocked(miko, ctx(2)))
        assertEquals(listOf("cafe-rain", "maid"), unlockedSituationIds(listOf(daily, maid, miko), ctx(1)))
        assertEquals(emptyList<String>(), unlockedSituationIds(listOf(daily, maid), ctx(-1)))
        assertEquals(listOf("cafe-rain"), unlockedSituationIds(listOf(daily, maid), OPTIMISTIC_UNLOCK))
        // Count band ahead of flags → "flag".
        assertEquals("flag", unlockReason(maid, UnlockContext(flags = listOf("B1"), effectiveLevel = 1)))
    }

    @Test
    fun chapterPendingAndSeasonReasons() {
        val pending = ctx(0, pending = 1)
        assertEquals("chapter", unlockReason(maid, pending))
        assertEquals(LOCKED_HINT["chapter"], situationLockHint(maid, pending))
        assertEquals("band", unlockReason(miko, pending))
        assertEquals("特別になったら", situationLockHint(miko, pending))
        assertEquals("season", unlockReason(halloween, ctx(1)))
        assertTrue(isSituationUnlocked(halloween, ctx(1, now = october)))
        assertFalse(isSituationUnlocked(halloween, ctx(0, now = october)))
    }

    @Test
    fun nsfwOnlyNeedsSpecialAndNsfwMode() {
        assertFalse(isSituationUnlocked(lateNight, ctx(3, nsfw = false)))
        assertEquals("mode", unlockReason(lateNight, ctx(3, nsfw = false)))
        assertFalse(isSituationUnlocked(lateNight, ctx(1, nsfw = true)))
        assertTrue(isSituationUnlocked(lateNight, ctx(2, nsfw = true)))
        assertFalse(isSituationUnlocked(bondNight, ctx(2, nsfw = true)))
        assertTrue(isSituationUnlocked(bondNight, ctx(3, nsfw = true)))
        assertEquals(LOCKED_HINT["mode"], situationLockHint(lateNight, ctx(3, nsfw = false)))
    }

    @Test
    fun lockHintsNameTheBandNeverANumber() {
        assertEquals("仲良しになったら", situationLockHint(maid, ctx(0)))
        assertEquals("特別になったら", situationLockHint(miko, ctx(1)))
        assertEquals("絆になったら", situationLockHint(bondNight, ctx(2, nsfw = true)))
        assertEquals("", situationLockHint(maid, ctx(1)))
        assertFalse(situationLockHint(miko, ctx(0)).any { it.isDigit() })
        assertEquals(mapOf("miko" to "band", "halloween" to "season"), situationLocks(listOf(daily, maid, miko, halloween), ctx(1)))
        // Server reason wins; band reason still names the band when the context is known.
        assertEquals("続きを見てから", lockHintFor("chapter", maid, ctx(0)))
        assertEquals("仲良しになったら", lockHintFor("band", maid, ctx(0)))
        assertEquals(LOCKED_SITUATION_HINT, lockHintFor("band", maid, null))
    }

    @Test
    fun storyRunnerBubblesAreDeterministicAndNeverDoublePost() {
        val beat = StoryBeat(
            id = "b1",
            kind = "choice",
            text = listOf("ここの窓際、空いてるよ。"),
            narration = "顔を上げる。",
            choices = listOf(StoryChoice(id = "c-a", label = "雨宿りいい？", next = "b2", userText = "助かった、雨宿りいい？")),
        )
        val bubbles = storyBeatBubbles("hiyori-ch0", beat)
        assertEquals(listOf("story-hiyori-ch0-b1-n", "story-hiyori-ch0-b1-0"), bubbles.map { it.id })
        assertTrue(bubbles[0].narration)
        val base = listOf(
            ChatMessage("assistant", "挨拶", id = "greeting"),
            ChatMessage("assistant", "おかえり", id = "welcome-2026-09-12"),
            ChatMessage("user", "こんばんは", id = "u-1"),
        )
        val once = appendUnique(base, bubbles)
        assertSame(once, appendUnique(once, bubbles))
        assertEquals(listOf("u-1", "story-hiyori-ch0-b1-n"), stripOpening(once).map { it.id }.take(2))
        val choice = choiceBubble("hiyori-ch0", "b1", beat.choices[0])
        assertEquals("choice-hiyori-ch0-b1", choice.id)
        assertEquals("助かった、雨宿りいい？", choice.content)
        assertTrue(composerHidden(beat))
        assertFalse(composerHidden(null))
        assertFalse(composerHidden(StoryBeat(id = "f", kind = "free", text = listOf("？"), next = "e")))
    }
}
