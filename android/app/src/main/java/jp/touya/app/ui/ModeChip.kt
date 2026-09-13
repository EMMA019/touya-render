package jp.touya.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import jp.touya.app.domain.ModePublic

@Composable
fun ModeChip(
    mode: ModePublic,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    locked: Boolean = false,
    lockHint: String = jp.touya.app.domain.NSFW_LOCK_HINT,
) {
    val nsfw = mode.nsfw
    Surface(
        onClick = { if (nsfw || !locked) onClick() },
        enabled = nsfw || !locked,
        modifier = modifier,
        shape = CircleShape,
        color = if (nsfw) Color(0x33FB7185) else MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Text(
            when {
                nsfw -> "NSFW"
                locked -> lockHint
                else -> "SFW"
            },
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            style = MaterialTheme.typography.labelSmall,
            color = if (nsfw) Color(0xFFFFE4E6) else MaterialTheme.colorScheme.onSurfaceVariant.copy(
                alpha = if (locked) 0.55f else 1f,
            ),
        )
    }
}
