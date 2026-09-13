package jp.touya.app.domain

const val DEFAULT_CHAT_MODE = "sfw"
const val NSFW_AGE_REQUIRED = "nsfw_age_required"
const val NSFW_AFFINITY_REQUIRED = "nsfw_affinity_required"
const val NSFW_MIN_AFFINITY_LEVEL = 2
const val NSFW_LOCK_HINT = "特別になってから"
const val NSFW_AFFINITY_REQUIRED_JA = "もっと仲良くなったら、特別な話ができるよ。"

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

/** Intimate / NSFW for this character. Debug unlimited is never consulted. */
fun canAccessNsfw(affinityLevel: Int, ageConfirmed: Boolean): Boolean =
    ageConfirmed && affinityLevel >= NSFW_MIN_AFFINITY_LEVEL

fun nsfwDenial(affinityLevel: Int, ageConfirmed: Boolean): String? =
    if (canAccessNsfw(affinityLevel, ageConfirmed)) null
    else if (!ageConfirmed) NSFW_AGE_REQUIRED
    else NSFW_AFFINITY_REQUIRED

sealed class ModeResolve {
    data class Ok(val mode: String) : ModeResolve()
    data class Rejected(val error: String = NSFW_AGE_REQUIRED, val mode: String = DEFAULT_CHAT_MODE) : ModeResolve()
}

/** Mirrors `src/lib/chat-mode.ts` resolveChatMode. */
fun resolveChatMode(
    requested: String? = null,
    storedMode: String = DEFAULT_CHAT_MODE,
    ageConfirmed: Boolean,
    affinityLevel: Int = 0,
): ModeResolve {
    val stored = coerceChatMode(storedMode)
    val next = if (requested == null) stored else parseChatMode(requested) ?: stored
    if (next == "nsfw") {
        val denied = nsfwDenial(affinityLevel, ageConfirmed)
        if (denied != null) {
            return if (requested == "nsfw") ModeResolve.Rejected(error = denied)
            else ModeResolve.Ok(DEFAULT_CHAT_MODE)
        }
    }
    return ModeResolve.Ok(next)
}
