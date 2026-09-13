package jp.touya.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ChatModeTest {
    @Test
    fun defaultModeIsSfw() {
        assertEquals("sfw", DEFAULT_CHAT_MODE)
        assertEquals("sfw", coerceChatMode(null))
        assertEquals("sfw", coerceChatMode("nope"))
        assertEquals("nsfw", parseChatMode("nsfw"))
    }

    @Test
    fun nsfwNeedsAgeAndSpecialAffinity() {
        assertFalse(canAccessNsfw(0, true))
        assertFalse(canAccessNsfw(1, true))
        assertFalse(canAccessNsfw(2, false))
        assertTrue(canAccessNsfw(2, true))
        assertEquals(2, NSFW_MIN_AFFINITY_LEVEL)
    }

    @Test
    fun nsfwWithoutAgeIsRejected() {
        val rejected = resolveChatMode(requested = "nsfw", storedMode = "sfw", ageConfirmed = false, affinityLevel = 3)
        assertTrue(rejected is ModeResolve.Rejected)
        assertEquals(NSFW_AGE_REQUIRED, (rejected as ModeResolve.Rejected).error)
    }

    @Test
    fun levelZeroAndOneCannotEnableNsfwEvenWithAge() {
        val zero = resolveChatMode(requested = "nsfw", storedMode = "sfw", ageConfirmed = true, affinityLevel = 0)
        assertTrue(zero is ModeResolve.Rejected)
        assertEquals(NSFW_AFFINITY_REQUIRED, (zero as ModeResolve.Rejected).error)
        val one = resolveChatMode(requested = "nsfw", storedMode = "sfw", ageConfirmed = true, affinityLevel = 1)
        assertTrue(one is ModeResolve.Rejected)
        assertEquals(NSFW_AFFINITY_REQUIRED, (one as ModeResolve.Rejected).error)
    }

    @Test
    fun nsfwWithAgeAndSpecialIsAccepted() {
        val ok = resolveChatMode(requested = "nsfw", storedMode = "sfw", ageConfirmed = true, affinityLevel = 2)
        assertTrue(ok is ModeResolve.Ok)
        assertEquals("nsfw", (ok as ModeResolve.Ok).mode)
    }

    @Test
    fun storedNsfwFallsBackForLockedCharacter() {
        val stored = resolveChatMode(storedMode = "nsfw", ageConfirmed = true, affinityLevel = 0)
        assertTrue(stored is ModeResolve.Ok)
        assertEquals("sfw", (stored as ModeResolve.Ok).mode)
    }

    @Test
    fun adsFlagFalseWhenNsfw() {
        assertFalse(adsAllowed("nsfw", true))
        assertFalse(adsAllowed("nsfw", false))
        assertTrue(adsAllowed("sfw", true))
        assertFalse(adsAllowed("sfw", false))
        assertFalse(ModePublic(chatMode = "nsfw", ageConfirmed = true, adsEnabled = false).adsEnabled)
    }
}
