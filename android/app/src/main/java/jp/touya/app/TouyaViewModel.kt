package jp.touya.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import jp.touya.app.data.Bond
import jp.touya.app.data.CharacterPublic
import jp.touya.app.data.ChatMessage
import jp.touya.app.data.ChatStore
import jp.touya.app.data.EMPTY_AFFINITY
import jp.touya.app.data.EMPTY_BOND
import jp.touya.app.data.AffinityPublic
import jp.touya.app.data.MemoryRow
import jp.touya.app.data.EMPTY_MODE
import jp.touya.app.data.Quota
import jp.touya.app.data.StoryBeat
import jp.touya.app.data.StoryPublic
import jp.touya.app.data.StoryScriptPublic
import jp.touya.app.data.StoryStepResponse
import jp.touya.app.data.TouyaClient
import jp.touya.app.data.VisitorStore
import jp.touya.app.data.seedSituationGreeting
import jp.touya.app.data.situationGreeting
import jp.touya.app.domain.ModePublic
import jp.touya.app.domain.NSFW_RELATIONSHIP_REQUIRED_JA
import jp.touya.app.domain.OPTIMISTIC_UNLOCK
import jp.touya.app.domain.UnlockContext
import jp.touya.app.domain.appendUnique
import jp.touya.app.domain.composeOpening
import jp.touya.app.domain.jstDayKey
import jp.touya.app.domain.readClock
import jp.touya.app.domain.situationLocks
import jp.touya.app.domain.storyBeatBubbles
import jp.touya.app.domain.choiceBubble
import jp.touya.app.domain.stripOpening
import jp.touya.app.domain.unlockedSituationIds
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class UiState(
    val screen: Screen = Screen.List,
    val characters: List<CharacterPublic> = emptyList(),
    val quota: Quota? = null,
    val messages: List<ChatMessage> = emptyList(),
    val input: String = "",
    val sending: Boolean = false,
    val loading: Boolean = true,
    val opening: Boolean = false,
    val error: String? = null,
    val situationId: String = "",
    val bond: Bond = EMPTY_BOND,
    val affinity: AffinityPublic = EMPTY_AFFINITY,
    val memory: List<MemoryRow> = emptyList(),
    val unlocked: List<String> = emptyList(),
    val memoryOpen: Boolean = false,
    val feedbackSent: Boolean = false,
    val rewarding: Boolean = false,
    val rewardMessage: String? = null,
    val situationCard: Boolean = true,
    val mode: ModePublic = EMPTY_MODE,
    val ageGateOpen: Boolean = false,
    /** scene id → lock reason from the server (display). */
    val locks: Map<String, String> = emptyMap(),
    val story: StoryPublic? = null,
    val script: StoryScriptPublic? = null,
    val storyBusy: Boolean = false,
) {
    /** The beat the visitor is parked on, if the script for it is loaded. */
    val currentBeat: StoryBeat? get() = script?.beat(story?.chapterId, story?.beat)

    val unlockContext: UnlockContext? get() = story?.let {
        UnlockContext(
            flags = it.flags,
            effectiveLevel = it.effectiveLevel,
            pendingChapter = it.pendingChapter,
            nsfwAllowed = mode.chatMode == "nsfw",
        )
    }
}

sealed interface Screen {
    data object List : Screen
    data class Chat(val character: CharacterPublic) : Screen
    data object Diagnosis : Screen
    data object Premium : Screen
    data object Policy : Screen
}

class TouyaViewModel(
    private val client: TouyaClient,
    private val store: ChatStore,
    private val visitorStore: VisitorStore? = null,
) : ViewModel() {
    private val _state = MutableStateFlow(
        UiState(
            mode = ModePublic(
                chatMode = visitorStore?.cachedChatMode() ?: "sfw",
                ageConfirmed = visitorStore?.cachedAgeConfirmed() == true,
                adsEnabled = (visitorStore?.cachedChatMode() ?: "sfw") != "nsfw",
            ),
        ),
    )
    val state: StateFlow<UiState> = _state
    private var seq = 0

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            runCatching {
                withContext(Dispatchers.IO) {
                    client.characters() to client.session()
                }
            }.onSuccess { (characters, session) ->
                cacheMode(session.mode)
                _state.update {
                    it.copy(
                        characters = characters,
                        quota = session.quota,
                        mode = session.mode,
                        loading = false,
                    )
                }
            }.onFailure { err ->
                _state.update {
                    it.copy(loading = false, error = err.message ?: "接続できません。API を確認してください。")
                }
            }
        }
    }

    fun open(character: CharacterPublic) {
        if (_state.value.opening) return
        viewModelScope.launch {
            _state.update { it.copy(opening = true, error = null, rewardMessage = null) }
            val companion = runCatching {
                withContext(Dispatchers.IO) { client.companion(character.id) }
            }.getOrNull()
            val bond = companion?.bond ?: EMPTY_BOND
            val affinity = companion?.affinity ?: character.affinity
            val story = companion?.story
            val script = companion?.script
            val saved = store.loadChat(character.id)
            val lastDay = store.loadLastVisitDay(character.id)
            val today = jstDayKey()
            val hook = if (lastDay != null && lastDay != today) store.loadHook(character.id) else null
            // Server unlocked/locks are the truth; Unlock.kt only fills in when the API is unreachable.
            val fallbackCtx = story?.let {
                UnlockContext(it.flags, it.effectiveLevel, it.pendingChapter, _state.value.mode.chatMode == "nsfw")
            } ?: OPTIMISTIC_UNLOCK
            val unlocked = companion?.unlocked?.ifEmpty { null }
                ?: unlockedSituationIds(character.situations, fallbackCtx)
            val locks = companion?.locks?.ifEmpty { null } ?: situationLocks(character.situations, fallbackCtx)
            val chapter = script?.chapter(story?.chapterId)
            val beat = script?.beat(story?.chapterId, story?.beat)
            val situationId = chapter?.situationId
                ?: character.situations.firstOrNull { unlocked.contains(it.id) }?.id
                ?: character.situations.firstOrNull()?.id.orEmpty()
            val scene = character.situations.firstOrNull { it.id == situationId }
            val messages = if (chapter != null && beat != null) {
                // A chapter beat is waiting: the script speaks instead of the greeting.
                appendUnique(stripOpening(saved), storyBeatBubbles(chapter.id, beat))
            } else {
                val opening = composeOpening(
                    id = character.id,
                    greeting = situationGreeting(scene, character.greeting),
                    welcomeBack = character.welcomeBack.ifBlank { character.greeting },
                    presence = character.presence,
                    clock = readClock(),
                    stage = bond.stage,
                    daysAway = if (lastDay != null && lastDay != today) maxOf(bond.daysAway, 1) else 0,
                    streak = bond.streak,
                    hook = hook,
                    firstVisit = saved.isEmpty() && lastDay == null,
                )
                if (saved.isNotEmpty()) {
                    if (lastDay != null && lastDay != today) {
                        saved + ChatMessage("assistant", opening.text, id = nextId("welcome"))
                    } else {
                        saved
                    }
                } else {
                    listOf(ChatMessage("assistant", opening.text, id = nextId("greeting")))
                }
            }
            if (lastDay != null && lastDay != today) store.clearHook(character.id)
            store.markVisit(character.id)
            store.saveChat(character.id, messages)
            _state.update {
                it.copy(
                    screen = Screen.Chat(character),
                    messages = messages,
                    input = "",
                    error = null,
                    situationId = situationId,
                    bond = bond,
                    affinity = affinity,
                    memory = companion?.memory.orEmpty(),
                    unlocked = unlocked,
                    locks = locks,
                    story = story,
                    script = script,
                    storyBusy = false,
                    memoryOpen = false,
                    feedbackSent = false,
                    opening = false,
                    rewarding = false,
                    rewardMessage = null,
                    situationCard = beat == null,
                )
            }
        }
    }

    fun setSituation(id: String) {
        val unlocked = _state.value.unlocked
        if (unlocked.isNotEmpty() && id !in unlocked) return
        val screen = _state.value.screen as? Screen.Chat ?: return
        val scene = screen.character.situations.firstOrNull { it.id == id }
        if (_state.value.situationId == id) {
            _state.update { it.copy(situationCard = true) }
            return
        }
        val greeting = situationGreeting(scene, screen.character.greeting)
        val messages = seedSituationGreeting(_state.value.messages, id, greeting)
        store.saveChat(screen.character.id, messages)
        _state.update { it.copy(situationId = id, messages = messages, situationCard = true) }
    }

    fun dismissSituationCard() {
        _state.update { it.copy(situationCard = false) }
    }

    /** Tap a story choice: user bubble now, next beat when the server answers. No LLM. */
    fun storyChoose(choiceId: String) {
        val s = _state.value
        val screen = s.screen as? Screen.Chat ?: return
        val story = s.story ?: return
        val beat = s.currentBeat ?: return
        val chapterId = story.chapterId ?: return
        val choice = beat.choices.firstOrNull { it.id == choiceId } ?: return
        if (s.storyBusy) return
        val withUser = appendUnique(s.messages, listOf(choiceBubble(chapterId, beat.id, choice)))
        store.saveChat(screen.character.id, withUser)
        _state.update { it.copy(messages = withUser, storyBusy = true, error = null) }
        storyStep(screen.character.id) { client.storyChoice(screen.character.id, chapterId, beat.id, choiceId) }
    }

    /** 「つづける」 on a line / retry beat. */
    fun storyAdvance() {
        val s = _state.value
        val screen = s.screen as? Screen.Chat ?: return
        val story = s.story ?: return
        val beat = s.currentBeat ?: return
        val chapterId = story.chapterId ?: return
        if (s.storyBusy) return
        _state.update { it.copy(storyBusy = true, error = null) }
        storyStep(screen.character.id) { client.storyAdvance(screen.character.id, chapterId, beat.id) }
    }

    private fun storyStep(characterId: String, call: () -> StoryStepResponse) {
        viewModelScope.launch {
            runCatching { withContext(Dispatchers.IO) { call() } }
                .onSuccess { response -> applyStoryResponse(characterId, response) }
                .onFailure { err ->
                    if (err is jp.touya.app.data.ApiException && err.message == "story_out_of_step") {
                        // Client and server disagree on the beat: reload the truth.
                        (_state.value.screen as? Screen.Chat)?.let { open(it.character) }
                    } else {
                        _state.update { it.copy(storyBusy = false, error = err.message ?: "進められませんでした。") }
                    }
                }
        }
    }

    private fun applyStoryResponse(characterId: String, response: StoryStepResponse) {
        val beat = response.beat
        if (beat?.kind == "end" && !beat.hook.isNullOrBlank()) store.saveHook(characterId, beat.hook)
        _state.update { s ->
            val chapterId = s.story?.chapterId ?: response.story.chapterId
            val messages = if (beat != null && chapterId != null) {
                appendUnique(s.messages, storyBeatBubbles(chapterId, beat))
            } else {
                s.messages
            }
            store.saveChat(characterId, messages)
            s.copy(
                messages = messages,
                story = response.story,
                script = response.script ?: s.script,
                unlocked = response.unlocked.ifEmpty { s.unlocked },
                locks = if (response.unlocked.isEmpty()) s.locks else response.locks,
                memory = response.memory ?: s.memory,
                storyBusy = false,
                situationCard = false,
            )
        }
    }

    fun showList() {
        _state.update {
            it.copy(screen = Screen.List, messages = emptyList(), error = null, memoryOpen = false)
        }
        refresh()
    }

    fun showDiagnosis() {
        _state.update { it.copy(screen = Screen.Diagnosis, error = null) }
    }

    fun showPremium() {
        _state.update { it.copy(screen = Screen.Premium, error = null) }
    }

    fun showPolicy() {
        _state.update { it.copy(screen = Screen.Policy, error = null) }
    }

    fun back() {
        showList()
    }

    fun setInput(value: String) {
        _state.update { it.copy(input = value.take(400)) }
    }

    fun toggleMemory(open: Boolean) {
        _state.update { it.copy(memoryOpen = open) }
    }

    fun send(raw: String) {
        val text = raw.trim()
        val screen = _state.value.screen as? Screen.Chat ?: return
        if (text.isEmpty() || _state.value.sending) return
        if (
            _state.value.quota?.debugUnlimited != true &&
            (_state.value.quota?.remaining ?: 1) <= 0
        ) {
            _state.update { it.copy(error = screen.character.farewell.ifBlank { "本日の無料枠を使い切りました。" }) }
            return
        }
        val storyNow = _state.value.story
        if (_state.value.mode.chatMode == "nsfw" && storyNow != null && !storyNow.nsfwEligible) {
            _state.update { it.copy(error = NSFW_RELATIONSHIP_REQUIRED_JA) }
            return
        }
        // A `free` beat: tag the send so the server injects the beat's hint and moves on after.
        val freeBeat = _state.value.currentBeat?.takeIf { it.kind == "free" }
        val freeChapterId = if (freeBeat != null) storyNow?.chapterId else null

        val history = _state.value.messages + ChatMessage("user", text, id = nextId("u"))
        val assistantId = nextId("a")
        _state.update {
            it.copy(
                messages = history + ChatMessage("assistant", "", pending = true, id = assistantId),
                input = "",
                sending = true,
                error = null,
                feedbackSent = false,
                situationCard = false,
            )
        }

        viewModelScope.launch {
            val assembled = StringBuilder()
            runCatching {
                withContext(Dispatchers.IO) {
                    client.streamChat(
                        characterId = screen.character.id,
                        situationId = _state.value.situationId.ifBlank { null },
                        mode = _state.value.mode.chatMode,
                        messages = history,
                        chapterId = freeChapterId,
                        beatId = freeBeat?.id,
                        onQuota = { quota -> _state.update { s -> s.copy(quota = quota) } },
                        onMode = { mode ->
                            cacheMode(mode)
                            _state.update { s -> s.copy(mode = mode) }
                        },
                        onBond = { bond -> _state.update { s -> s.copy(bond = bond) } },
                        onAffinity = { affinity -> _state.update { s -> s.copy(affinity = affinity) } },
                        onStory = { story ->
                            // The free beat was answered: the script's next beat (usually `end`) speaks after the reply.
                            val after = if (freeBeat != null && story.beat != freeBeat.id) {
                                _state.value.script?.beat(freeChapterId, freeBeat.next)
                            } else {
                                null
                            }
                            if (after?.kind == "end" && !after.hook.isNullOrBlank()) {
                                store.saveHook(screen.character.id, after.hook)
                            }
                            _state.update { s ->
                                val screenState = s.screen as? Screen.Chat
                                val ctx = UnlockContext(
                                    flags = story.flags,
                                    effectiveLevel = story.effectiveLevel,
                                    pendingChapter = story.pendingChapter,
                                    nsfwAllowed = s.mode.chatMode == "nsfw",
                                )
                                s.copy(
                                    story = story,
                                    messages = if (after != null && freeChapterId != null) {
                                        appendUnique(s.messages, storyBeatBubbles(freeChapterId, after))
                                    } else {
                                        s.messages
                                    },
                                    unlocked = screenState?.let { unlockedSituationIds(it.character.situations, ctx) } ?: s.unlocked,
                                    locks = screenState?.let { situationLocks(it.character.situations, ctx) } ?: s.locks,
                                )
                            }
                        },
                        onDelta = { chunk ->
                            assembled.append(chunk)
                            val snapshot = assembled.toString()
                            replaceAssistant(assistantId, snapshot, pending = true)
                        },
                        onReplace = { replaced ->
                            assembled.clear()
                            assembled.append(replaced)
                            replaceAssistant(assistantId, replaced, pending = true)
                        },
                        onDone = { },
                    )
                }
            }.onSuccess {
                _state.update { s ->
                    val next = s.messages.map { msg ->
                        if (msg.id == assistantId) msg.copy(pending = false) else msg
                    }
                    val reply = next.find { it.id == assistantId }?.content.orEmpty()
                    if ((s.quota?.remaining ?: 0) <= 1 && reply.isNotBlank()) {
                        store.saveHook(screen.character.id, reply)
                    }
                    store.saveChat(screen.character.id, next)
                    s.copy(sending = false, messages = next)
                }
                refreshMemory(screen.character.id)
            }.onFailure { err ->
                _state.update { s ->
                    val cleaned = s.messages.filterNot { it.id == assistantId && it.content.isEmpty() }
                        .map { msg -> if (msg.id == assistantId) msg.copy(pending = false) else msg }
                    store.saveChat(screen.character.id, cleaned)
                    s.copy(
                        sending = false,
                        error = if (err is jp.touya.app.data.ApiException && err.code == 429) {
                            screen.character.farewell.ifBlank { err.message }
                        } else {
                            err.message ?: screen.character.offline.ifBlank { "送信に失敗しました。" }
                        },
                        messages = cleaned,
                    )
                }
            }
        }
    }

    fun forget(text: String) {
        val screen = _state.value.screen as? Screen.Chat ?: return
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { client.forget(screen.character.id, text) }
            }.onSuccess { facts ->
                _state.update { it.copy(memory = facts) }
            }
        }
    }

    fun reportWrong() {
        val screen = _state.value.screen as? Screen.Chat ?: return
        if (_state.value.feedbackSent) return
        val last = _state.value.messages.lastOrNull { it.role == "assistant" && it.content.isNotBlank() } ?: return
        _state.update { it.copy(feedbackSent = true) }
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    client.feedback(screen.character.id, _state.value.situationId, last.content)
                }
            }
        }
    }

    fun requestNsfw() {
        val story = _state.value.story
        if (story != null && !story.nsfwEligible) {
            // Relationship below 特別: no age gate, no /api/mode call.
            _state.update { it.copy(error = NSFW_RELATIONSHIP_REQUIRED_JA) }
            return
        }
        if (_state.value.mode.ageConfirmed) {
            setMode(chatMode = "nsfw")
        } else {
            _state.update { it.copy(ageGateOpen = true) }
        }
    }

    fun closeAgeGate() {
        _state.update { it.copy(ageGateOpen = false) }
    }

    fun confirmAgeAndEnableNsfw() {
        setMode(confirmAge = true, chatMode = "nsfw", closeGate = true)
    }

    fun leaveNsfw() {
        setMode(chatMode = "sfw")
    }

    fun toggleMode() {
        if (_state.value.mode.nsfw) leaveNsfw() else requestNsfw()
    }

    private fun setMode(confirmAge: Boolean = false, chatMode: String? = null, closeGate: Boolean = false) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { client.setMode(confirmAge, chatMode) }
            }.onSuccess { mode ->
                cacheMode(mode)
                _state.update {
                    it.copy(
                        mode = mode,
                        ageGateOpen = if (closeGate) false else it.ageGateOpen,
                        error = null,
                    )
                }
            }.onFailure { err ->
                _state.update {
                    it.copy(
                        ageGateOpen = if (closeGate) false else it.ageGateOpen,
                        error = err.message,
                    )
                }
            }
        }
    }

    private fun cacheMode(mode: ModePublic) {
        visitorStore?.cacheMode(mode.chatMode, mode.ageConfirmed)
    }

    fun watchReward() {
        if (_state.value.rewarding) return
        if (!_state.value.mode.adsEnabled) return
        if ((_state.value.quota?.rewardsLeft ?: 0) <= 0) return
        viewModelScope.launch {
            _state.update { it.copy(rewarding = true, rewardMessage = null) }
            runCatching {
                withContext(Dispatchers.IO) { client.watchRewardStub() }
            }.onSuccess { quota ->
                _state.update {
                    it.copy(
                        quota = quota,
                        rewarding = false,
                        rewardMessage = "+3通 足しました（AdMob スタブ）。",
                        error = null,
                    )
                }
            }.onFailure { err ->
                _state.update {
                    it.copy(
                        rewarding = false,
                        rewardMessage = err.message ?: "リワードを受け取れませんでした。",
                    )
                }
            }
        }
    }

    private fun refreshMemory(characterId: String) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { client.memory(characterId) }
            }.onSuccess { facts ->
                _state.update { it.copy(memory = facts) }
            }
        }
    }

    private fun replaceAssistant(id: String, content: String, pending: Boolean) {
        _state.update { s ->
            s.copy(
                messages = s.messages.map { msg ->
                    if (msg.id == id) msg.copy(content = content, pending = pending) else msg
                },
            )
        }
    }

    private fun nextId(prefix: String): String {
        seq += 1
        return "$prefix-$seq"
    }

    companion object {
        fun factory(client: TouyaClient, store: ChatStore, visitorStore: VisitorStore? = null): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return TouyaViewModel(client, store, visitorStore) as T
                }
            }
    }
}
