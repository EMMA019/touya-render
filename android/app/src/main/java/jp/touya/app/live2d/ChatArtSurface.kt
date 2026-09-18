package jp.touya.app.live2d

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage

/**
 * Single chat art surface: still PNG (Coil) by default, Live2D only when
 * the Cubism Java SDK is linked, the dev flag is on, and a model exists.
 */
@Composable
fun ChatArtSurface(
    characterId: String,
    situationId: String,
    stillModel: String?,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val resolved = remember(characterId, situationId) {
        resolveChatArt(context.assets, characterId, situationId)
    }
    var live2dFailed by remember(resolved) { mutableStateOf(false) }
    val spec = resolved.second

    if (resolved.first == ChatArtMode.LIVE2D && spec != null && !live2dFailed) {
        Live2dSurface(
            spec = spec,
            modifier = modifier,
            onError = { live2dFailed = true },
        )
    } else if (stillModel != null) {
        AsyncImage(
            model = stillModel,
            contentDescription = null,
            modifier = modifier.fillMaxSize(),
            contentScale = ContentScale.Fit,
            alignment = Alignment.Center,
        )
    }
}
