package jp.touya.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import jp.touya.app.data.Quota

@Composable
fun QuotaPill(quota: Quota?, modifier: Modifier = Modifier, compact: Boolean = false) {
    val debug = quota?.debugUnlimited == true
    if (debug) return
    val label = when {
        quota == null -> "…"
        debug && compact -> "DEBUG"
        debug -> "DEBUG ∞"
        compact -> quota.remaining.toString()
        else -> quota.remaining.toString()
    }
    Surface(modifier, shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            style = MaterialTheme.typography.labelMedium,
        )
    }
}
