package jp.touya.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import jp.touya.app.data.CharacterPublic
import jp.touya.app.data.EMPTY_MODE
import jp.touya.app.data.Quota
import jp.touya.app.data.formatBwh
import jp.touya.app.domain.ModePublic
import jp.touya.app.domain.pickTodayLine
import jp.touya.app.domain.readClock

@Composable
fun CharacterListScreen(
    characters: List<CharacterPublic>,
    quota: Quota?,
    loading: Boolean,
    error: String?,
    opening: Boolean,
    onSelect: (CharacterPublic) -> Unit,
    onRetry: () -> Unit,
    onDiagnosis: () -> Unit,
    onPremium: () -> Unit,
    onPolicy: () -> Unit,
    mode: ModePublic = EMPTY_MODE,
    ageGateOpen: Boolean = false,
    onToggleMode: () -> Unit = {},
    onConfirmAge: () -> Unit = {},
    onCloseAgeGate: () -> Unit = {},
) {
    val clock = remember { readClock() }
    Column(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("とうや", style = MaterialTheme.typography.labelSmall)
                Text("燈夜", style = MaterialTheme.typography.headlineMedium)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ModeChip(mode, onClick = onToggleMode, locked = true)
                QuotaPill(quota)
            }
        }
        Text("夜に、話せる相手がいる。", style = MaterialTheme.typography.titleMedium)
        Text(
            "雨の音を聴きながらでも、仕事帰りでも。4人の中から、今の気分に合う相手を選んでください。昨夜話した続きも覚えています。会員登録は不要です。無料枠は1日10通。日付が変わると、また話しかけられます。",
            style = MaterialTheme.typography.bodyMedium,
        )
        Button(onDiagnosis, Modifier.fillMaxWidth()) {
            Text("今夜の相手を診断する")
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onPolicy) { Text("燈夜のこだわりと約束") }
            TextButton(onPremium) { Text("広告なしで話す") }
        }
        AdPlaceholder(adsEnabled = mode.adsEnabled)
        when {
            loading -> CircularProgressIndicator()
            error != null -> {
                Text(error, color = MaterialTheme.colorScheme.error)
                Button(onRetry) { Text("再読み込み") }
            }
            else -> LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
            ) {
                items(characters, key = { it.id }) { character ->
                    val tonight = pickTodayLine(
                        character.presence,
                        clock,
                        "first",
                        "${character.id}:${clock.day}",
                    ) ?: character.greeting
                    Card(colors = CardDefaults.cardColors()) {
                        Column {
                            character.rosterArt()?.let { art ->
                                AsyncImage(
                                    model = art,
                                    contentDescription = null,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(220.dp),
                                    contentScale = ContentScale.Fit,
                                    alignment = Alignment.Center,
                                )
                            }
                            Column(
                                Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Text(character.job, style = MaterialTheme.typography.labelSmall)
                                Text(character.name, style = MaterialTheme.typography.titleLarge)
                                Text(character.reading, style = MaterialTheme.typography.labelSmall)
                                formatBwh(character.bwh)?.let { measurements ->
                                    Text(measurements, style = MaterialTheme.typography.bodyMedium)
                                }
                                AffinityGauge(character.affinity)
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text("今夜", style = MaterialTheme.typography.labelSmall)
                                    Text("「$tonight」", style = MaterialTheme.typography.bodySmall)
                                }
                                Button(
                                    { onSelect(character) },
                                    Modifier.fillMaxWidth(),
                                    enabled = !opening,
                                ) {
                                    Text(if (opening) "開いています…" else "話しかける")
                                }
                            }
                        }
                    }
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 8.dp)) {
                        Text(
                            "登場人物はすべて大人のフィクションキャラクターです。未成年を連想させる表現や、成人向け・NSFWコンテンツは取り扱っておりません。",
                            style = MaterialTheme.typography.labelSmall,
                        )
                        Text(
                            "お使いの端末に保存されるのは、ランダムに発行された匿名識別子と対話履歴のみです。お名前や連絡先などを取得することはありません。",
                            style = MaterialTheme.typography.labelSmall,
                        )
                        Text(
                            "無料の会話可能数は日本時間の毎日午前0時にリセットされます。リワード広告をご覧いただくことで、当日分の会話数を増やすことができます。",
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                }
            }
        }
        AgeGateDialog(open = ageGateOpen, onConfirm = onConfirmAge, onCancel = onCloseAgeGate)
    }
}
