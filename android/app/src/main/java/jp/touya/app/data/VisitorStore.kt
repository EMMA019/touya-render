package jp.touya.app.data

import android.content.Context
import java.util.UUID
import jp.touya.app.domain.DEFAULT_REPLY_STYLE
import jp.touya.app.domain.coerceReplyStyle

/** Local install UUID + mode cache. No name, email, phone, or account. */
class VisitorStore(context: Context) {
    private val prefs = context.getSharedPreferences("touya", Context.MODE_PRIVATE)

    fun anonymousInstallId(): String {
        val existing = prefs.getString(KEY, null)
        if (!existing.isNullOrBlank()) return existing
        val created = UUID.randomUUID().toString()
        prefs.edit().putString(KEY, created).apply()
        return created
    }

    fun cachedChatMode(): String = prefs.getString(MODE_KEY, "sfw") ?: "sfw"

    fun cachedAgeConfirmed(): Boolean = prefs.getBoolean(AGE_KEY, false)

    fun cachedReplyStyle(): String = coerceReplyStyle(prefs.getString(STYLE_KEY, DEFAULT_REPLY_STYLE))

    fun cacheMode(chatMode: String, ageConfirmed: Boolean, replyStyle: String = DEFAULT_REPLY_STYLE) {
        prefs.edit()
            .putString(MODE_KEY, if (chatMode == "nsfw") "nsfw" else "sfw")
            .putBoolean(AGE_KEY, ageConfirmed)
            .putString(STYLE_KEY, coerceReplyStyle(replyStyle))
            .apply()
    }

    @Deprecated("Use anonymousInstallId()")
    fun visitorId(): String = anonymousInstallId()

    companion object {
        private const val KEY = "anon_install_id"
        private const val MODE_KEY = "chat_mode"
        private const val AGE_KEY = "age_confirmed"
        private const val STYLE_KEY = "reply_style"
    }
}
