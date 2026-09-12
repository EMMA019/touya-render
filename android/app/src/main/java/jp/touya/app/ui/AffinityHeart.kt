package jp.touya.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import jp.touya.app.data.AffinityPublic
import jp.touya.app.data.EMPTY_AFFINITY

@Composable
fun AffinityHeart(affinity: AffinityPublic = EMPTY_AFFINITY, modifier: Modifier = Modifier) {
    Surface(
        modifier.semantics { contentDescription = affinity.name },
        shape = CircleShape,
        color = Color.Black.copy(alpha = 0.4f),
    ) {
        Row(
            Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("♡", color = Color(0xFFF4C4C8))
            Text(affinity.name, color = Color(0xFFF4C4C8), style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
fun AffinityGauge(affinity: AffinityPublic = EMPTY_AFFINITY, modifier: Modifier = Modifier) {
    val fill = affinity.progress.coerceIn(0f, 1f)
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("♡", color = Color(0xFFF4C4C8), style = MaterialTheme.typography.labelSmall)
            Text(affinity.name, color = Color(0xFFF4C4C8), style = MaterialTheme.typography.labelSmall)
        }
        Box(
            Modifier
                .fillMaxWidth()
                .height(2.dp)
                .background(Color.White.copy(alpha = 0.12f), CircleShape),
        ) {
            Box(
                Modifier
                    .fillMaxWidth(fill)
                    .fillMaxHeight()
                    .background(Color(0xFFF4C4C8).copy(alpha = 0.85f), CircleShape),
            )
        }
    }
}
