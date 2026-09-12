package jp.touya.app.data

import android.content.Context
import java.util.UUID

/** Local install UUID only. No name, email, phone, or account. */
class VisitorStore(context: Context) {
    private val prefs = context.getSharedPreferences("touya", Context.MODE_PRIVATE)

    fun anonymousInstallId(): String {
        val existing = prefs.getString(KEY, null)
        if (!existing.isNullOrBlank()) return existing
        val created = UUID.randomUUID().toString()
        prefs.edit().putString(KEY, created).apply()
        return created
    }

    @Deprecated("Use anonymousInstallId()")
    fun visitorId(): String = anonymousInstallId()

    companion object {
        private const val KEY = "anon_install_id"
    }
}
