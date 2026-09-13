package jp.touya.app.data

import jp.touya.app.BuildConfig
import jp.touya.app.domain.DailyPick
import jp.touya.app.domain.ModePublic
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.util.concurrent.TimeUnit

/**
 * Thin client for the Next.js API.
 * Safety / DeepSeek / daily cap live on the server — this app cannot bypass them.
 */
class TouyaClient(
    private val visitorId: String,
    private val baseUrl: String = BuildConfig.API_BASE_URL.trimEnd('/'),
) {
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.SECONDS)
        .callTimeout(0, TimeUnit.SECONDS)
        .build()

    fun health(): Boolean {
        val body = get("/api/health")
        return JSONObject(body).optBoolean("ok")
    }

    fun setMode(confirmAge: Boolean = false, chatMode: String? = null): ModePublic {
        val payload = JSONObject().apply {
            if (confirmAge) put("confirmAge", true)
            if (!chatMode.isNullOrBlank()) put("chatMode", chatMode)
        }
        val response = http.newCall(
            request("/api/mode").post(payload.toString().toRequestBody(jsonType)).build(),
        ).execute()
        val body = response.body?.string().orEmpty()
        val root = runCatching { JSONObject(body) }.getOrNull() ?: JSONObject()
        if (!response.isSuccessful) {
            throw ApiException(root.optString("message").ifBlank { "モードを変更できません。" }, response.code)
        }
        return parseMode(root)
    }

    fun characters(): List<CharacterPublic> = home().characters

    fun home(): HomeSnapshot {
        val root = JSONObject(get("/api/characters"))
        val list = root.getJSONArray("characters")
        val characters = buildList {
            for (i in 0 until list.length()) {
                add(parseCharacter(list.getJSONObject(i)))
            }
        }
        return HomeSnapshot(
            characters = characters,
            daily = root.optJSONObject("daily")?.let { parseDaily(it) },
        )
    }

    fun daily(): DailyPick? {
        val root = JSONObject(get("/api/daily"))
        return parseDaily(root)
    }

    fun usage(): Quota {
        return parseQuota(JSONObject(get("/api/usage")))
    }

    fun session(): SessionSnapshot {
        val root = JSONObject(get("/api/session"))
        return SessionSnapshot(
            quota = parseQuota(root.getJSONObject("quota")),
            mode = parseMode(root),
        )
    }

    fun companion(characterId: String): CompanionSnapshot {
        val root = JSONObject(get("/api/companion?characterId=$characterId"))
        return CompanionSnapshot(
            bond = parseBond(root.optJSONObject("bond") ?: JSONObject()),
            memory = parseFacts(root.optJSONArray("memory")),
            unlocked = stringList(root.optJSONArray("unlocked")),
            affinity = parseAffinity(root.optJSONObject("affinity")),
        )
    }

    fun memory(characterId: String): List<MemoryRow> {
        val root = JSONObject(get("/api/memory?characterId=$characterId"))
        return parseFacts(root.optJSONArray("facts"))
    }

    fun forget(characterId: String, text: String): List<MemoryRow> {
        val payload = JSONObject()
            .put("characterId", characterId)
            .put("text", text)
        val response = http.newCall(
            request("/api/memory").delete(payload.toString().toRequestBody(jsonType)).build(),
        ).execute()
        val body = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
            throw ApiException("忘れられませんでした (${response.code})", response.code)
        }
        return parseFacts(JSONObject(body).optJSONArray("facts"))
    }

    fun feedback(characterId: String, situationId: String?, assistantText: String) {
        val payload = JSONObject()
            .put("characterId", characterId)
            .put("assistantText", assistantText)
            .apply {
                if (!situationId.isNullOrBlank()) put("situationId", situationId)
            }
        val response = http.newCall(
            request("/api/feedback").post(payload.toString().toRequestBody(jsonType)).build(),
        ).execute()
        if (!response.isSuccessful) {
            throw ApiException("送れませんでした (${response.code})", response.code)
        }
    }

    fun watchRewardStub(): Quota {
        val response = http.newCall(
            request("/api/reward").post("{}".toRequestBody(jsonType)).build(),
        ).execute()
        val body = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
            throw ApiException("reward_failed", response.code)
        }
        val root = JSONObject(body)
        return parseQuota(root.getJSONObject("quota"))
    }

    fun streamChat(
        characterId: String,
        situationId: String? = null,
        mode: String? = null,
        messages: List<ChatMessage>,
        onQuota: (Quota) -> Unit,
        onBond: (Bond) -> Unit,
        onAffinity: (AffinityPublic) -> Unit = {},
        onMode: (ModePublic) -> Unit = {},
        onDelta: (String) -> Unit,
        onReplace: (String) -> Unit,
        onDone: (gated: Boolean) -> Unit,
    ) {
        val payload = JSONObject()
            .put("characterId", characterId)
            .apply {
                if (!situationId.isNullOrBlank()) put("situationId", situationId)
                if (!mode.isNullOrBlank()) put("mode", mode)
            }
            .put(
                "messages",
                JSONArray().apply {
                    messages.filter { it.content.isNotBlank() }.forEach { msg ->
                        put(
                            JSONObject()
                                .put("role", msg.role)
                                .put("content", msg.content),
                        )
                    }
                },
            )

        val request = request("/api/chat")
            .post(payload.toString().toRequestBody(jsonType))
            .build()

        http.newCall(request).execute().use { response ->
            if (response.code == 403) {
                val err = response.body?.string().orEmpty()
                val obj = runCatching { JSONObject(err) }.getOrNull()
                throw ApiException(obj?.optString("message").orEmpty().ifBlank {
                    "18歳以上の確認が必要です。"
                }, response.code)
            }
            if (response.code == 429) {
                val err = response.body?.string().orEmpty()
                val obj = runCatching { JSONObject(err) }.getOrNull()
                val message = obj?.optString("message").orEmpty().ifBlank {
                    "本日の会話上限に達しました。"
                }
                if (obj != null && obj.has("remaining")) {
                    onQuota(parseQuota(obj))
                }
                throw ApiException(message, response.code)
            }
            if (!response.isSuccessful) {
                throw ApiException("送信に失敗しました (${response.code})", response.code)
            }
            val reader = BufferedReader(response.body!!.charStream())
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                val raw = line ?: continue
                if (!raw.startsWith("data:")) continue
                val data = raw.removePrefix("data:").trim()
                if (data.isEmpty()) continue
                val obj = JSONObject(data)
                when (obj.optString("type")) {
                    "quota" -> onQuota(parseQuota(obj))
                    "bond" -> onBond(parseBond(obj))
                    "affinity" -> onAffinity(parseAffinity(obj))
                    "mode" -> onMode(parseMode(obj))
                    "delta" -> onDelta(obj.optString("text"))
                    "replace" -> onReplace(obj.optString("text"))
                    "done" -> onDone(obj.optBoolean("gated"))
                    "error" -> throw ApiException(
                        obj.optString("message", "モデル側で失敗しました。"),
                    )
                }
            }
        }
    }

    private fun get(path: String): String {
        val response = http.newCall(request(path).get().build()).execute()
        val body = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
            throw ApiException("取得に失敗しました (${response.code})", response.code)
        }
        return body
    }

    private fun request(path: String): Request.Builder =
        Request.Builder()
            .url("$baseUrl$path")
            .header("x-touya-vid", visitorId)
            .header("Accept", "application/json")

    private fun parseCharacter(obj: JSONObject): CharacterPublic {
        val palette = obj.getJSONObject("palette")
        val suggestions = obj.getJSONArray("suggestions")
        return CharacterPublic(
            id = obj.getString("id"),
            name = obj.getString("name"),
            reading = obj.getString("reading"),
            job = obj.getString("job"),
            tagline = obj.getString("tagline"),
            greeting = obj.getString("greeting"),
            welcomeBack = obj.optString("welcomeBack"),
            farewell = obj.optString("farewell"),
            offline = obj.optString("offline"),
            tone = obj.getString("tone"),
            artStyle = obj.optString("artStyle").ifBlank { "anime" },
            suggestions = stringList(suggestions),
            situations = buildList {
                val scenes = obj.optJSONArray("situations") ?: return@buildList
                for (i in 0 until scenes.length()) {
                    val scene = scenes.getJSONObject(i)
                    add(
                        SituationPublic(
                            id = scene.optString("id"),
                            title = scene.optString("title"),
                            image = scene.optNullString("image"),
                            video = scene.optNullString("video"),
                            season = scene.optNullString("season"),
                            costume = scene.optNullString("costume"),
                            greeting = scene.optNullString("greeting"),
                            lines = parseSituationLines(scene.optJSONArray("lines")),
                            minLevel = scene.optInt("minLevel", 0),
                            nsfwOnly = scene.optBoolean("nsfwOnly", false),
                        ),
                    )
                }
            },
            palette = Palette(
                from = palette.optString("from"),
                to = palette.optString("to"),
                glow = palette.optString("glow"),
                hair = palette.optString("hair"),
                accent = palette.optString("accent"),
            ),
            portraitImage = obj.optNullString("portraitImage"),
            presence = obj.optJSONObject("presence")?.let { parsePresence(it) },
            bwh = parseBwh(obj.optJSONObject("bwh")),
            affinity = parseAffinity(obj.optJSONObject("affinity")),
            unlocked = stringList(obj.optJSONArray("unlocked")),
        )
    }

    private fun parseBwh(obj: JSONObject?): CharacterBwh? {
        if (obj == null) return null
        if (!obj.has("bust") || !obj.has("waist") || !obj.has("hip")) return null
        return CharacterBwh(
            bust = obj.getInt("bust"),
            waist = obj.getInt("waist"),
            hip = obj.getInt("hip"),
        )
    }

    private fun parsePresence(obj: JSONObject): CharacterPresence {
        val todayArr = obj.optJSONArray("today") ?: JSONArray()
        val today = buildList {
            for (i in 0 until todayArr.length()) {
                val line = todayArr.getJSONObject(i)
                add(
                    TodayLine(
                        text = line.optString("text"),
                        whenPart = line.optNullString("when"),
                        weekday = line.optNullString("weekday"),
                        month = if (line.has("month") && !line.isNull("month")) line.optInt("month") else null,
                        stage = line.optNullString("stage"),
                    ),
                )
            }
        }
        val absences = obj.optJSONObject("absences")
        val streaks = obj.optJSONObject("streaks")
        val staged = obj.optJSONObject("suggestionsByStage")
        val byStage = mutableMapOf<String, List<String>>()
        if (staged != null) {
            staged.keys().forEach { key ->
                byStage[key] = stringList(staged.optJSONArray(key))
            }
        }
        return CharacterPresence(
            today = today,
            hooks = stringList(obj.optJSONArray("hooks")),
            absences = Absences(
                short = stringList(absences?.optJSONArray("short")),
                few = stringList(absences?.optJSONArray("few")),
                week = stringList(absences?.optJSONArray("week")),
            ),
            streaks = Streaks(
                three = stringList(streaks?.optJSONArray("three")),
                seven = stringList(streaks?.optJSONArray("seven")),
            ),
            suggestionsByStage = byStage,
        )
    }

    private fun parseMode(obj: JSONObject): ModePublic {
        val nested = obj.optJSONObject("mode")
        val src = nested ?: obj
        val chatMode = src.optString("chatMode").ifBlank { obj.optString("chatMode") }.ifBlank { "sfw" }
        val ads = if (src.has("adsEnabled")) src.optBoolean("adsEnabled") else obj.optBoolean("adsEnabled", chatMode != "nsfw")
        return ModePublic(
            chatMode = if (chatMode == "nsfw") "nsfw" else "sfw",
            ageConfirmed = src.optBoolean("ageConfirmed", obj.optBoolean("ageConfirmed")),
            ageConfirmedAt = src.optNullString("ageConfirmedAt") ?: obj.optNullString("ageConfirmedAt"),
            adsEnabled = ads && chatMode != "nsfw",
        )
    }

    private fun parseQuota(obj: JSONObject): Quota =
        Quota(
            used = obj.optInt("used"),
            limit = obj.optInt("limit", 10),
            remaining = obj.optInt("remaining"),
            day = obj.optString("day"),
            extra = obj.optInt("extra"),
            premium = obj.optBoolean("premium"),
            rewardsLeft = obj.optInt("rewardsLeft", 2),
            debugUnlimited = obj.optBoolean("debugUnlimited"),
        )

    private fun parseBond(obj: JSONObject): Bond =
        Bond(
            daysMet = obj.optInt("daysMet"),
            factCount = obj.optInt("factCount"),
            stage = obj.optString("stage").ifBlank { "first" },
            lastDay = obj.optNullString("lastDay"),
            firstDay = obj.optNullString("firstDay"),
            streak = obj.optInt("streak"),
            daysAway = obj.optInt("daysAway"),
        )

    private fun parseDaily(obj: JSONObject): DailyPick? {
        val characterId = obj.optString("characterId")
        val situationId = obj.optString("situationId")
        if (characterId.isBlank() || situationId.isBlank()) return null
        return DailyPick(
            date = obj.optString("date"),
            characterId = characterId,
            situationId = situationId,
            title = obj.optString("title"),
            blurb = obj.optString("blurb"),
            characterName = obj.optString("characterName"),
            givenName = obj.optString("givenName"),
            image = obj.optNullString("image"),
            untilNext = if (obj.has("untilNext") && !obj.isNull("untilNext")) obj.optInt("untilNext") else null,
            untilNextName = obj.optNullString("untilNextName"),
            checkedIn = obj.optBoolean("checkedIn"),
            firstToday = obj.optBoolean("firstToday"),
        )
    }

    private fun parseAffinity(obj: JSONObject?): AffinityPublic {
        if (obj == null) return EMPTY_AFFINITY
        val name = obj.optString("name")
        if (name.isNotBlank() && obj.has("level")) {
            return AffinityPublic(
                count = obj.optInt("count"),
                level = obj.optInt("level"),
                name = name,
                nextAt = if (obj.has("nextAt") && !obj.isNull("nextAt")) obj.optInt("nextAt") else null,
                progress = obj.optDouble("progress", 0.0).toFloat(),
            )
        }
        return levelFromCount(obj.optInt("count"))
    }

    private fun parseSituationLines(arr: JSONArray?): List<SituationLine> {
        if (arr == null) return emptyList()
        return buildList {
            for (i in 0 until arr.length()) {
                val item = arr.get(i)
                when (item) {
                    is JSONObject -> {
                        val text = item.optString("text").trim()
                        if (text.isNotBlank()) {
                            add(SituationLine(text = text, minLevel = item.optInt("minLevel", 0)))
                        }
                    }
                    else -> {
                        val text = item.toString().trim()
                        if (text.isNotBlank() && text != "null") add(SituationLine(text))
                    }
                }
            }
        }
    }

    private fun parseFacts(arr: JSONArray?): List<MemoryRow> {
        if (arr == null) return emptyList()
        return buildList {
            for (i in 0 until arr.length()) {
                val row = arr.getJSONObject(i)
                add(
                    MemoryRow(
                        kind = row.optString("kind"),
                        text = row.optString("text"),
                        at = row.optString("at"),
                    ),
                )
            }
        }
    }

    private fun stringList(arr: JSONArray?): List<String> {
        if (arr == null) return emptyList()
        return buildList {
            for (i in 0 until arr.length()) add(arr.getString(i))
        }
    }
}

private fun JSONObject.optNullString(key: String): String? {
    if (!has(key) || isNull(key)) return null
    return optString(key).ifBlank { null }
}

class ApiException(message: String, val code: Int = 0) : RuntimeException(message)
