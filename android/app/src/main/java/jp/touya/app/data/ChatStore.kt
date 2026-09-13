package jp.touya.app.data

import android.content.Context
import jp.touya.app.domain.jstDayKey
import org.json.JSONArray
import org.json.JSONObject

/** Local chat / visit / hook. Mirrors `src/lib/chat-history.ts`. No PII. */
class ChatStore(context: Context) {
    private val prefs = context.getSharedPreferences("touya-chat", Context.MODE_PRIVATE)

    fun loadChat(characterId: String): List<ChatMessage> {
        val raw = prefs.getString(chatKey(characterId), null) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val row = arr.getJSONObject(i)
                    val role = row.optString("role")
                    val content = row.optString("content")
                    if ((role == "user" || role == "assistant") && content.isNotBlank()) {
                        add(
                            ChatMessage(
                                id = row.optString("id").ifBlank { "m-$i" },
                                role = role,
                                content = content,
                                narration = row.optBoolean("narration", false),
                            ),
                        )
                    }
                }
            }.takeLast(LIMIT)
        }.getOrDefault(emptyList())
    }

    fun saveChat(characterId: String, messages: List<ChatMessage>) {
        val compact = messages
            .filter { it.content.isNotBlank() }
            .takeLast(LIMIT)
        val arr = JSONArray()
        compact.forEach { msg ->
            arr.put(
                JSONObject()
                    .put("id", msg.id)
                    .put("role", msg.role)
                    .put("content", msg.content)
                    .apply { if (msg.narration) put("narration", true) },
            )
        }
        prefs.edit().putString(chatKey(characterId), arr.toString()).apply()
    }

    fun loadLastVisitDay(characterId: String): String? =
        prefs.getString(visitKey(characterId), null)

    fun markVisit(characterId: String): String {
        val day = jstDayKey()
        prefs.edit().putString(visitKey(characterId), day).apply()
        return day
    }

    fun saveHook(characterId: String, text: String) {
        val payload = JSONObject()
            .put("day", jstDayKey())
            .put("text", text.take(160))
        prefs.edit().putString(hookKey(characterId), payload.toString()).apply()
    }

    fun loadHook(characterId: String): String? {
        val raw = prefs.getString(hookKey(characterId), null) ?: return null
        return runCatching {
            JSONObject(raw).optString("text").trim().ifBlank { null }
        }.getOrNull()
    }

    fun clearHook(characterId: String) {
        prefs.edit().remove(hookKey(characterId)).apply()
    }

    private fun chatKey(id: String) = "touya-chat-v1:$id"
    private fun visitKey(id: String) = "touya-visit-v1:$id"
    private fun hookKey(id: String) = "touya-hook-v1:$id"

    companion object {
        const val LIMIT = 20
    }
}
