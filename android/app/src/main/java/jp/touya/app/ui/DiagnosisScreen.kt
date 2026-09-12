package jp.touya.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import jp.touya.app.data.CharacterPublic
import jp.touya.app.domain.DIAGNOSIS_QUESTIONS
import jp.touya.app.domain.scoreDiagnosis

@Composable
fun DiagnosisScreen(
    characters: List<CharacterPublic>,
    onSelect: (CharacterPublic) -> Unit,
    onBack: () -> Unit,
) {
    val answers = remember { mutableStateListOf<Int>() }
    val step = answers.size
    val done = step >= DIAGNOSIS_QUESTIONS.size
    val result = if (done) scoreDiagnosis(answers.toList()) else null
    val match = characters.find { it.id == result?.id }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("とうや", style = MaterialTheme.typography.labelSmall)
        Text("今夜の相手診断", style = MaterialTheme.typography.headlineMedium)
        Text(
            "10問の簡単な質問です。登録は不要です。診断結果がお使いの端末の外へ送信されることはありません。",
            style = MaterialTheme.typography.bodyMedium,
        )
        if (done) {
            Text("今夜の相手", style = MaterialTheme.typography.labelSmall)
            if (match != null) {
                Text(match.name, style = MaterialTheme.typography.headlineSmall)
                Text(match.reading, style = MaterialTheme.typography.labelSmall)
                Text(match.tagline, style = MaterialTheme.typography.bodyMedium)
                Text("「${match.greeting}」", style = MaterialTheme.typography.bodySmall)
                Button({ onSelect(match) }, Modifier.fillMaxWidth()) {
                    Text("話しかける")
                }
            } else {
                Text("相手の名簿を読み込めていません。一覧から選び直してください。", style = MaterialTheme.typography.bodyMedium)
            }
            TextButton({ answers.clear() }, Modifier.fillMaxWidth()) {
                Text("もう一度診断する")
            }
        } else {
            val question = DIAGNOSIS_QUESTIONS[step]
            Text("${step + 1} / ${DIAGNOSIS_QUESTIONS.size}", style = MaterialTheme.typography.labelSmall)
            Text(question.prompt, style = MaterialTheme.typography.titleLarge)
            question.choices.forEachIndexed { index, choice ->
                OutlinedButton(
                    { answers.add(index) },
                    Modifier.fillMaxWidth(),
                ) {
                    Text(choice.label)
                }
            }
            if (step > 0) {
                TextButton({ answers.removeAt(answers.lastIndex) }) {
                    Text("ひとつ戻る")
                }
            }
        }
        TextButton(onBack) { Text("一覧に戻る") }
    }
}
