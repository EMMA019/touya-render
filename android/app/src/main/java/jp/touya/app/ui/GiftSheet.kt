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
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import jp.touya.app.data.GiftPublic

@Composable
fun GiftSheet(
    open: Boolean,
    gifts: List<GiftPublic>,
    giftedToday: Boolean,
    sending: Boolean,
    error: String?,
    onClose: () -> Unit,
    onGive: (String) -> Unit,
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
                Text("贈る", color = Color(0xFFF6EDE0))
                TextButton(onClose) { Text("閉じる", color = Color(0xFFD9C8B0)) }
            }
            Text(
                if (giftedToday) "今日はもう贈ったよ。また明日ね。" else "1日1つ。チャットの代わりにはならない。",
                color = Color(0xFFD9C8B0),
            )
            gifts.chunked(2).forEach { row ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    row.forEach { gift ->
                        val locked = giftedToday || sending || gift.premium
                        Surface(
                            onClick = { onGive(gift.id) },
                            enabled = !locked,
                            shape = RoundedCornerShape(12.dp),
                            color = Color.White.copy(alpha = 0.05f),
                            modifier = Modifier.weight(1f),
                        ) {
                            Column(
                                Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(gift.name, color = Color(0xFFF6EDE0))
                                    Text("+${gift.affinityDelta}", color = Color(0xFFF4C4C8))
                                }
                                Text(gift.hint, color = Color(0xFFD9C8B0))
                                if (gift.favorite) {
                                    Text("お好み", color = Color(0xFFE8C48A))
                                }
                                if (gift.premium) {
                                    Text("Booth で後から", color = Color(0xFFD9C8B0))
                                }
                            }
                        }
                    }
                    if (row.size == 1) {
                        Box(Modifier.weight(1f))
                    }
                }
            }
            if (error != null) {
                Text(error, color = Color(0xFFFFC9C9))
            }
        }
    }
}
