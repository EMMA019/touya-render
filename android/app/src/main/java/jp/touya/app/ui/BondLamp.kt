package jp.touya.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import jp.touya.app.data.BOND_LABEL

@Composable
fun BondLamp(stage: String, modifier: Modifier = Modifier) {
    val lit = when (stage) {
        "familiar" -> 2
        "regular" -> 3
        else -> 1
    }
    val label = BOND_LABEL[stage] ?: "初対面"
    Surface(
        modifier.semantics { contentDescription = label },
        shape = CircleShape,
        color = Color.Black.copy(alpha = 0.4f),
    ) {
        Row(
            Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            repeat(3) { index ->
                val on = index < lit
                Box(
                    Modifier
                        .size(6.dp)
                        .background(
                            if (on) Color(0xFFF5D48A).copy(alpha = if (stage == "first") 0.4f else 1f)
                            else Color.White.copy(alpha = 0.2f),
                            CircleShape,
                        ),
                )
            }
        }
    }
}
