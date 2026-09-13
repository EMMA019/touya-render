package jp.touya.app.domain

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TtsTest {
    @Test
    fun speakerOnlyOnReadyAssistantLinesWhenConfigured() {
        assertTrue(showTtsSpeaker(true, "assistant", false, "席、空いてる。"))
        assertFalse(showTtsSpeaker(false, "assistant", false, "席、空いてる。"))
        assertFalse(showTtsSpeaker(true, "user", false, "疲れた"))
        assertFalse(showTtsSpeaker(true, "assistant", true, "席"))
        assertFalse(showTtsSpeaker(true, "assistant", false, "  "))
    }
}
