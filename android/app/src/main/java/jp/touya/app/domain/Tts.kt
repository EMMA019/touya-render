package jp.touya.app.domain

/** Speaker on assistant key lines only. Hidden when TTS was never configured or failed once. */
fun showTtsSpeaker(
    available: Boolean,
    role: String,
    pending: Boolean,
    text: String,
): Boolean = available && role == "assistant" && !pending && text.isNotBlank()
