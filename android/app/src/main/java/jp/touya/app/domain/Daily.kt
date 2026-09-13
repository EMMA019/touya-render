package jp.touya.app.domain

data class DailyPick(
    val date: String,
    val characterId: String,
    val situationId: String,
    val title: String,
    val blurb: String,
    val characterName: String = "",
    val givenName: String = "",
    val image: String? = null,
    val untilNext: Int? = null,
    val untilNextName: String? = null,
    val checkedIn: Boolean = false,
    val firstToday: Boolean = false,
)

fun untilNextLabel(remaining: Int?, name: String?): String? {
    if (remaining == null || remaining <= 0 || name.isNullOrBlank()) return null
    return "あと${remaining}で${name.trim()}"
}

fun dailyPartnerLabel(pick: DailyPick): String =
    pick.givenName.ifBlank { pick.characterName }.ifBlank { "今夜の相手" }
