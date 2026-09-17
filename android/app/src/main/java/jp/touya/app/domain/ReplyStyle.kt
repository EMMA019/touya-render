package jp.touya.app.domain

const val DEFAULT_REPLY_STYLE = "basic"

val REPLY_STYLES = listOf("basic", "longform", "story")

val REPLY_STYLE_LABELS = mapOf(
    "basic" to "基本",
    "longform" to "長文",
    "story" to "ストーリー",
)

fun parseReplyStyle(value: String?): String? =
    if (value == "basic" || value == "longform" || value == "story") value else null

fun coerceReplyStyle(value: String?): String = parseReplyStyle(value) ?: DEFAULT_REPLY_STYLE

fun replyStyleLabel(value: String?): String =
    REPLY_STYLE_LABELS[coerceReplyStyle(value)] ?: "基本"
