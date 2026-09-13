package jp.touya.app.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage

/**
 * Single chat art surface: looping muted situation video when it resolves,
 * else the Coil still PNG. Live2D (PR #5 Cubism shell) is an optional slot
 * used only when explicitly enabled and no situation video is present.
 */
@Composable
fun ChatArtSurface(
    characterId: String,
    situationId: String,
    stillModel: String?,
    videoPath: String? = null,
    modifier: Modifier = Modifier,
    live2dEligible: Boolean = false,
    live2d: @Composable (() -> Unit)? = null,
) {
    val context = LocalContext.current
    val videoUri = remember(videoPath, characterId, situationId) {
        resolveSituationVideoUri(
            explicit = videoPath,
            characterId = characterId,
            situationId = situationId,
            assetAvailable = { rel ->
                runCatching { context.assets.open(rel).use { } }.isSuccess
            },
        )
    }
    var videoFailed by remember(videoUri) { mutableStateOf(false) }
    val kind = resolveChatArtKind(
        videoResolved = videoUri != null && !videoFailed,
        live2dEligible = live2dEligible && live2d != null,
    )

    when {
        kind == ChatArtKind.VIDEO && videoUri != null -> {
            SituationVideoSurface(
                uri = videoUri,
                modifier = modifier,
                onError = { videoFailed = true },
            )
        }
        kind == ChatArtKind.LIVE2D && live2d != null -> live2d()
        stillModel != null -> {
            AsyncImage(
                model = stillModel,
                contentDescription = null,
                modifier = modifier.fillMaxSize(),
                contentScale = ContentScale.Fit,
                alignment = Alignment.Center,
            )
        }
    }
}

@Composable
internal fun SituationVideoSurface(
    uri: String,
    modifier: Modifier = Modifier,
    onError: () -> Unit = {},
) {
    val context = LocalContext.current
    val player = remember {
        ExoPlayer.Builder(context).build().apply {
            repeatMode = Player.REPEAT_MODE_ONE
            volume = 0f
            playWhenReady = true
        }
    }

    DisposableEffect(uri) {
        val listener = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                onError()
            }
        }
        player.addListener(listener)
        player.setMediaItem(MediaItem.fromUri(uri))
        player.prepare()
        player.play()
        onDispose {
            player.removeListener(listener)
            player.stop()
            player.clearMediaItems()
        }
    }

    DisposableEffect(player) {
        onDispose { player.release() }
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner, player) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> player.play()
                Lifecycle.Event.ON_PAUSE -> player.pause()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    AndroidView(
        factory = { viewContext ->
            PlayerView(viewContext).apply {
                useController = false
                resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                setShutterBackgroundColor(android.graphics.Color.TRANSPARENT)
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                this.player = player
            }
        },
        update = { view -> view.player = player },
        modifier = modifier.fillMaxSize(),
    )
}
