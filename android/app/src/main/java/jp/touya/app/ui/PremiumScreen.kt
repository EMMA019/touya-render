package jp.touya.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun PremiumScreen(onBack: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("とうや", style = MaterialTheme.typography.labelSmall)
        Text("広告なしで、ゆっくり話す", style = MaterialTheme.typography.headlineMedium)
        Text(
            "無料プランは1日10通まで（広告あり）。広告なしプランなら1日40通まで楽しめます。どちらのプランでも、個人情報の登録は一切不要です。",
            style = MaterialTheme.typography.bodyMedium,
        )
        Card { Text("無料プラン：1日10通まで（バナー広告表示あり）。短い広告を視聴することで、当日分を3通追加できます（1日最大2回まで）。", Modifier.padding(16.dp)) }
        Card { Text("広告なしプラン：1日40通まで会話可能。お名前やメールアドレスの登録は一切不要です。", Modifier.padding(16.dp)) }
        Card { Text("※ アプリ内課金機能は現在 Android 版向けに準備中です。Web 版は広告視聴とリワードで引き続きお楽しみいただけます。", Modifier.padding(16.dp)) }
        TextButton(onBack) { Text("一覧に戻る") }
    }
}
