package jp.touya.app.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class ReplyStyleTest {
    @Test
    fun defaultIsBasic() {
        assertEquals("basic", DEFAULT_REPLY_STYLE)
        assertEquals("basic", coerceReplyStyle(null))
        assertEquals("basic", coerceReplyStyle("nope"))
        assertEquals("longform", parseReplyStyle("longform"))
        assertEquals("story", parseReplyStyle("story"))
    }

    @Test
    fun labelsMatchWeb() {
        assertEquals("基本", replyStyleLabel("basic"))
        assertEquals("長文", replyStyleLabel("longform"))
        assertEquals("ストーリー", replyStyleLabel("story"))
        assertEquals(listOf("basic", "longform", "story"), REPLY_STYLES)
    }
}
