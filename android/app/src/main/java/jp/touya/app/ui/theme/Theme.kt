package jp.touya.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Night = darkColorScheme(
    primary = Color(0xFFE8C48A),
    onPrimary = Color(0xFF2A1C10),
    background = Color(0xFF120C18),
    onBackground = Color(0xFFF6EDE0),
    surface = Color(0xFF1A1224),
    onSurface = Color(0xFFF6EDE0),
    surfaceVariant = Color(0xFF2A2038),
    onSurfaceVariant = Color(0xFFD9C8B0),
    error = Color(0xFFFFB4AB),
)

@Composable
fun TouyaTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Night, content = content)
}
