package jp.touya.app.domain

import jp.touya.app.data.ChatMessage
import jp.touya.app.data.StoryBeat
import jp.touya.app.data.StoryChoice

/**
 * Mirror of src/lib/story-runner.ts. Bubble ids are deterministic so a resumed
 * chapter never double-posts. The runner never calls the LLM; only a `free`
 * beat goes through the normal chat send.
 */

private val OPENING_IDS = Regex("^(greeting|welcome-)")

fun storyBubbleId(chapterId: String, beatId: String, index: Any): String = "story-$chapterId-$beatId-$index"

/** Narration caption (if any) followed by one assistant bubble per `text` element. */
fun storyBeatBubbles(chapterId: String, beat: StoryBeat): List<ChatMessage> = buildList {
    beat.narration?.trim()?.takeIf { it.isNotEmpty() }?.let {
        add(ChatMessage("assistant", it, id = storyBubbleId(chapterId, beat.id, "n"), narration = true))
    }
    beat.text.forEachIndexed { index, text ->
        val content = text.trim()
        if (content.isNotEmpty()) add(ChatMessage("assistant", content, id = storyBubbleId(chapterId, beat.id, index)))
    }
}

fun choiceBubble(chapterId: String, beatId: String, choice: StoryChoice): ChatMessage =
    ChatMessage("user", (choice.userText ?: choice.label).trim(), id = "choice-$chapterId-$beatId")

/** Append only bubbles whose id is not already present. */
fun appendUnique(messages: List<ChatMessage>, bubbles: List<ChatMessage>): List<ChatMessage> {
    val seen = messages.map { it.id }.toSet()
    val fresh = bubbles.filter { it.id !in seen }
    return if (fresh.isEmpty()) messages else messages + fresh
}

/** Drop the greeting / welcome-back bubbles: the chapter speaks instead. Saved chat stays. */
fun stripOpening(messages: List<ChatMessage>): List<ChatMessage> =
    messages.filterNot { OPENING_IDS.containsMatchIn(it.id) }

/** Composer is hidden while a non-free beat waits for a tap. */
fun composerHidden(beat: StoryBeat?): Boolean = beat != null && beat.kind != "free"
