package jp.touya.app.domain

data class DiagnosisChoice(
    val label: String,
    val scores: Map<String, Int>,
)

data class DiagnosisQuestion(
    val id: String,
    val prompt: String,
    val choices: List<DiagnosisChoice>,
)

data class DiagnosisResult(
    val id: String,
    val scores: Map<String, Int>,
)

private val TIEBREAK = listOf("hiyori", "rione", "shiraishi", "clara")

val DIAGNOSIS_QUESTIONS: List<DiagnosisQuestion> = listOf(
    DiagnosisQuestion(
        id = "mood",
        prompt = "今の夜、いちばん近いのは？",
        choices = listOf(
            DiagnosisChoice("甘えて、休みたい", mapOf("hiyori" to 2)),
            DiagnosisChoice("少し突っかかってほしい", mapOf("rione" to 2)),
            DiagnosisChoice("黙って隣にいてほしい", mapOf("shiraishi" to 2)),
            DiagnosisChoice("丁寧に、ゆっくり話したい", mapOf("clara" to 2)),
        ),
    ),
    DiagnosisQuestion(
        id = "place",
        prompt = "今夜いるなら、どこ？",
        choices = listOf(
            DiagnosisChoice("雨のカフェの窓際", mapOf("hiyori" to 2)),
            DiagnosisChoice("明かりを落としたオフィス", mapOf("rione" to 2)),
            DiagnosisChoice("風の強い屋上", mapOf("shiraishi" to 2)),
            DiagnosisChoice("黄昏のテラス", mapOf("clara" to 2)),
        ),
    ),
    DiagnosisQuestion(
        id = "talk",
        prompt = "相手の口調は？",
        choices = listOf(
            DiagnosisChoice("やわらかく、否定しない", mapOf("hiyori" to 2)),
            DiagnosisChoice("棘がある。あとからフォローする", mapOf("rione" to 2)),
            DiagnosisChoice("短い。余計なことは言わない", mapOf("shiraishi" to 2)),
            DiagnosisChoice("丁寧で、余白がある", mapOf("clara" to 2)),
        ),
    ),
    DiagnosisQuestion(
        id = "energy",
        prompt = "今日の残り体力は？",
        choices = listOf(
            DiagnosisChoice("もう甘えたいだけ", mapOf("hiyori" to 2)),
            DiagnosisChoice("仕事のあと、まだ少し残ってる", mapOf("rione" to 2)),
            DiagnosisChoice("頭は動く。口は動かしたくない", mapOf("shiraishi" to 2)),
            DiagnosisChoice("静かに整えて終わりたい", mapOf("clara" to 2)),
        ),
    ),
    DiagnosisQuestion(
        id = "rain",
        prompt = "雨の音がする夜は？",
        choices = listOf(
            DiagnosisChoice("温かいものを置いて、隣にいたい", mapOf("hiyori" to 2)),
            DiagnosisChoice("傘も差さず、先に歩きたい", mapOf("rione" to 1, "shiraishi" to 1)),
            DiagnosisChoice("屋上で、雨を見ていたい", mapOf("shiraishi" to 2)),
            DiagnosisChoice("室内の灯りだけで十分", mapOf("clara" to 2)),
        ),
    ),
    DiagnosisQuestion(
        id = "work",
        prompt = "仕事や勉強のあと、欲しい言葉は？",
        choices = listOf(
            DiagnosisChoice("「無理しなくていい」", mapOf("hiyori" to 1, "clara" to 1)),
            DiagnosisChoice("「要点だけ言って」", mapOf("rione" to 2)),
            DiagnosisChoice("「仮説は、置いて休め」", mapOf("shiraishi" to 2)),
            DiagnosisChoice("「続きは、あとからでいい」", mapOf("clara" to 2)),
        ),
    ),
    DiagnosisQuestion(
        id = "distance",
        prompt = "距離感は？",
        choices = listOf(
            DiagnosisChoice("すぐ隣。肩が触れてもいい", mapOf("hiyori" to 2)),
            DiagnosisChoice("近いけど、素直にはなれない", mapOf("rione" to 2)),
            DiagnosisChoice("同じ空間にいる、それでいい", mapOf("shiraishi" to 2)),
            DiagnosisChoice("一呼吸おいて、隣へ座る", mapOf("clara" to 2)),
        ),
    ),
    DiagnosisQuestion(
        id = "language",
        prompt = "外国語が混じったら？",
        choices = listOf(
            DiagnosisChoice("なくてもいい", mapOf("hiyori" to 1, "rione" to 1)),
            DiagnosisChoice("短い英語なら、聞いてみたい", mapOf("clara" to 2)),
            DiagnosisChoice("静かな日本語だけでいい", mapOf("shiraishi" to 2)),
            DiagnosisChoice("仕事言葉のほうが楽", mapOf("rione" to 2)),
        ),
    ),
    DiagnosisQuestion(
        id = "conflict",
        prompt = "少し意見が違ったとき？",
        choices = listOf(
            DiagnosisChoice("受け止めて、隣にいてほしい", mapOf("hiyori" to 2)),
            DiagnosisChoice("一度突き放して、あとで残ってほしい", mapOf("rione" to 2)),
            DiagnosisChoice("短い了解だけでいい", mapOf("shiraishi" to 2)),
            DiagnosisChoice("否定せず、別の言い方をくれる", mapOf("clara" to 2)),
        ),
    ),
    DiagnosisQuestion(
        id = "morning",
        prompt = "明日また会うなら、どんな約束？",
        choices = listOf(
            DiagnosisChoice("席、あけておくね", mapOf("hiyori" to 2)),
            DiagnosisChoice("残ってなさいよ", mapOf("rione" to 2)),
            DiagnosisChoice("屋上にいる", mapOf("shiraishi" to 2)),
            DiagnosisChoice("テラスで待ちましょう", mapOf("clara" to 2)),
        ),
    ),
)

fun scoreDiagnosis(answers: List<Int>): DiagnosisResult {
    val scores = mutableMapOf(
        "hiyori" to 0,
        "rione" to 0,
        "shiraishi" to 0,
        "clara" to 0,
    )
    answers.forEachIndexed { index, choiceIndex ->
        val choice = DIAGNOSIS_QUESTIONS.getOrNull(index)?.choices?.getOrNull(choiceIndex) ?: return@forEachIndexed
        choice.scores.forEach { (id, value) ->
            scores[id] = (scores[id] ?: 0) + value
        }
    }
    val id = scores.keys.sortedWith { a, b ->
        val byScore = (scores[b] ?: 0).compareTo(scores[a] ?: 0)
        if (byScore != 0) byScore else TIEBREAK.indexOf(a).compareTo(TIEBREAK.indexOf(b))
    }.first()
    return DiagnosisResult(id = id, scores = scores)
}
