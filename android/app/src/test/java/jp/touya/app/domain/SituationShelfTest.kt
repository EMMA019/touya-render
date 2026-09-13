package jp.touya.app.domain

import jp.touya.app.data.CharacterPublic
import jp.touya.app.data.EMPTY_AFFINITY
import jp.touya.app.data.Palette
import jp.touya.app.data.SituationPublic
import jp.touya.app.data.levelFromCount
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SituationShelfTest {
    private val daily = SituationPublic(id = "cafe-rain", title = "雨のカフェ", image = "/situations/hiyori/cafe-rain.png")
    private val maid = SituationPublic(id = "maid", title = "メイド", costume = "maid", minLevel = 1)
    private val intimate = SituationPublic(
        id = "after-hours",
        title = "夜更け",
        image = "/situations/hiyori/secret.png",
        nsfwOnly = true,
        minLevel = 2,
    )

    private fun character(
        unlocked: List<String> = emptyList(),
        affinityLevelCount: Int = 0,
    ): CharacterPublic = CharacterPublic(
        id = "hiyori",
        name = "桃瀬 ひより",
        reading = "ももせ ひより",
        job = "大学生",
        tagline = "甘えていいよって言う人。",
        greeting = "席、空いてる。",
        tone = "甘え",
        suggestions = listOf("雨の音"),
        situations = listOf(daily, maid, intimate),
        palette = Palette("#4a1824", "#e08a78", "rgba(0,0,0,0)", "#6a2c28", "#f6c4b4"),
        affinity = levelFromCount(affinityLevelCount),
        unlocked = unlocked,
    )

    @Test
    fun givenNameTakesLastToken() {
        assertEquals("ひより", givenName("桃瀬 ひより"))
        assertEquals("クララ", givenName("クララ"))
    }

    @Test
    fun nsfwOnlyStaysLockedUntilSpecial() {
        assertFalse(isSituationUnlocked(intimate, 10, affinityLevel = 1, nsfwAllowed = false))
        assertFalse(isSituationUnlocked(intimate, 10, affinityLevel = 2, nsfwAllowed = false))
        assertTrue(isSituationUnlocked(intimate, 0, affinityLevel = 2, nsfwAllowed = true))
        assertNull(daysUntilUnlock(intimate, 10, affinityLevel = 1, nsfwAllowed = false))
        assertEquals(LOCKED_INTIMATE_HINT, situationLockHint(intimate, 0))
    }

    @Test
    fun shelfHidesIntimateArtUntilUnlocked() {
        val locked = collectShelfCards(listOf(character()))
        val secret = locked.first { it.situation.id == "after-hours" }
        assertTrue(secret.locked)
        assertEquals(LOCKED_INTIMATE_TITLE, secret.title)
        assertNull(secret.image)
        assertEquals(LOCKED_INTIMATE_HINT, secret.lockHint)
        assertFalse(locked.first { it.situation.id == "cafe-rain" }.locked)
    }

    @Test
    fun sfwTabDropsNsfwOnlyAndSpecialCanShow() {
        val sfw = collectShelfCards(listOf(character()), tab = ShelfTab.SFW)
        assertTrue(sfw.none { it.nsfwOnly })
        val open = collectShelfCards(
            listOf(character(unlocked = listOf("cafe-rain", "maid", "after-hours"), affinityLevelCount = 30)),
        )
        val secret = open.first { it.situation.id == "after-hours" }
        assertFalse(secret.locked)
        assertEquals("夜更け", secret.title)
        assertEquals("/situations/hiyori/secret.png", secret.image)
    }

    @Test
    fun shelfHidesCostumeStubsAndEmptyTabs() {
        val cards = collectShelfCards(listOf(character()))
        assertTrue(cards.none { it.situation.id == "maid" })
        assertFalse(hasFinishedSituationArt(maid.copy(image = "/situations/hiyori/portrait.png")))
        assertTrue(hasFinishedSituationArt(daily))
        val tabs = visibleShelfTabs(listOf(character()))
        assertTrue(tabs.none { it == ShelfTab.MAID })
        assertTrue(tabs.contains(ShelfTab.DAILY))
    }

    @Test
    fun emptyAffinityIsAcquaintance() {
        assertEquals("知り合い", EMPTY_AFFINITY.name)
        assertEquals(0, EMPTY_AFFINITY.level)
    }
}
