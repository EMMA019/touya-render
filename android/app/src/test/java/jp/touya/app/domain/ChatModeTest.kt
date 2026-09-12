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
    fun nsfwWithoutAgeIsRejected() {
        val rejected = resolveChatMode(requested = "nsfw", storedMode = "sfw", ageConfirmed = false)
        assertTrue(rejected is ModeResolve.Rejected)
        assertEquals(NSFW_AGE_REQUIRED, (rejected as ModeResolve.Rejected).error)

        val stored = resolveChatMode(storedMode = "nsfw", ageConfirmed = false)
        assertTrue(stored is ModeResolve.Rejected)
    }

    @Test
    fun nsfwWithAgeIsAccepted() {
        val ok = resolveChatMode(requested = "nsfw", storedMode = "sfw", ageConfirmed = true)
        assertTrue(ok is ModeResolve.Ok)
        assertEquals("nsfw", (ok as ModeResolve.Ok).mode)
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
