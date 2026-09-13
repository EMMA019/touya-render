package jp.touya.app.domain

const val DEFAULT_CHAT_MODE = "sfw"
const val NSFW_AGE_REQUIRED = "nsfw_age_required"
/** NSFW also needs the relationship (effective band) to reach 特別. Server-enforced; this is the copy. */
const val NSFW_RELATIONSHIP_REQUIRED = "nsfw_relationship_required"
const val NSFW_RELATIONSHIP_REQUIRED_JA = "まだ、そこまでじゃない。"

data class ModePublic(
    val chatMode: String = DEFAULT_CHAT_MODE,
    val ageConfirmed: Boolean = false,
    val ageConfirmedAt: String? = null,
    val adsEnabled: Boolean = true,
) {
    val nsfw: Boolean get() = chatMode == "nsfw"
}

fun parseChatMode(value: String?): String? =
    if (value == "sfw" || value == "nsfw") value else null

fun coerceChatMode(value: String?): String = parseChatMode(value) ?: DEFAULT_CHAT_MODE

fun adsAllowed(mode: String, envAdsEnabled: Boolean = true): Boolean =
    envAdsEnabled && mode != "nsfw"

sealed class ModeResolve {
    data class Ok(val mode: String) : ModeResolve()
    data class Rejected(val error: String = NSFW_AGE_REQUIRED, val mode: String = DEFAULT_CHAT_MODE) : ModeResolve()
}

/** Mirrors `src/lib/chat-mode.ts` resolveChatMode. */
fun resolveChatMode(
    requested: String? = null,
    storedMode: String = DEFAULT_CHAT_MODE,
    ageConfirmed: Boolean,
): ModeResolve {
    val stored = coerceChatMode(storedMode)
    val next = if (requested == null) stored else parseChatMode(requested) ?: stored
    if (next == "nsfw" && !ageConfirmed) {
        return ModeResolve.Rejected()
    }
    return ModeResolve.Ok(next)
}
