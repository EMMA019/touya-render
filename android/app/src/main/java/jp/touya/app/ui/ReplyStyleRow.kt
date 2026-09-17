package jp.touya.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import jp.touya.app.domain.REPLY_STYLES
import jp.touya.app.domain.coerceReplyStyle
import jp.touya.app.domain.replyStyleLabel

@Composable
fun ReplyStyleRow(
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val current = coerceReplyStyle(selected)
    Row(
        modifier = modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        REPLY_STYLES.forEach { style ->
            val on = style == current
            Surface(
                onClick = { onSelect(style) },
                shape = CircleShape,
                color = if (on) Color.White.copy(alpha = 0.92f) else Color.Black.copy(alpha = 0.4f),
            ) {
                Text(
                    replyStyleLabel(style),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    color = if (on) Color(0xFF1C1917) else Color.White.copy(alpha = 0.85f),
                )
            }
        }
    }
}
