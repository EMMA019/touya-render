package jp.touya.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

private val RULES = listOf(
    Triple(
        "知っていても、自分から長々と語らない",
        "設定やこれまでの短い記憶は大切に持っています。ただし、聞かれたときや自然な相槌として必要なときだけ一言返すにとどめ、プロフィールを並べ立てるような不自然な会話はしません。",
        false,
    ),
    Triple(
        "覚える内容を大切に選ぶ",
        "「覚えておいて」と頼まれたことや、お名前、好みの話題など、ずっと続く大切な事柄だけを残します。今日だけの疲れや他愛ない雑談を無暗にデータベースに残すことはありません。",
        false,
    ),
    Triple(
        "性的な会話はお断りします",
        "性的なロールプレイや過度な要求には応じません。そうした発言が重なった場合、そのお相手との会話は一定時間お休みとなります。",
        true,
    ),
    Triple(
        "1回のお返事に真心を込める",
        "送信されたメッセージごとに、その場で素直に1回だけ応答を生成します。過剰な監視モデルによる書き換えや検閲ループを挟まず、自然な対話を大切にしています。",
        false,
    ),
    Triple(
        "会員登録や個人情報は不要",
        "お名前やメールアドレスを収集することはありません。お使いの端末内に保持される匿名の識別情報と、端末に保存された対話履歴だけで安心してご利用いただけます。",
        false,
    ),
)

@Composable
fun PolicyScreen(onBack: () -> Unit, nsfw: Boolean = false) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("とうや", style = MaterialTheme.typography.labelSmall)
        Text("燈夜のこだわりと約束", style = MaterialTheme.typography.headlineMedium)
        RULES.forEach { (title, body, sfwOnly) ->
            if (sfwOnly && nsfw) return@forEach
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(title, style = MaterialTheme.typography.titleSmall)
                    Text(body, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        TextButton(onBack) { Text("一覧に戻る") }
    }
}
