package jp.touya.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import jp.touya.app.data.MemoryRow

private val KIND_LABEL = mapOf(
    "profile" to "呼び名",
    "preference" to "好み",
    "relationship" to "関係",
    "agreement" to "約束",
)

@Composable
fun MemorySheet(
    open: Boolean,
    facts: List<MemoryRow>,
    onClose: () -> Unit,
    onForget: (String) -> Unit,
) {
    if (!open) return
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f)),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .background(Color(0xF2141018), RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("覚えていること", color = Color(0xFFF6EDE0))
                TextButton(onClose) { Text("閉じる", color = Color(0xFFD9C8B0)) }
            }
            if (facts.isEmpty()) {
                Text(
                    "まだ残していません。「覚えて」と名前、続く好みだけ残します。雑談の1通は残りません。",
                    color = Color(0xFFD9C8B0),
                )
            } else {
                facts.forEach { fact ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                KIND_LABEL[fact.kind] ?: fact.kind,
                                color = Color(0xFFD9C8B0),
                            )
                            Text(fact.text, color = Color(0xFFF6EDE0))
                        }
                        TextButton({ onForget(fact.text) }) {
                            Text("忘れる", color = Color(0xFFD9C8B0))
                        }
                    }
                }
            }
        }
    }
}
