package jp.touya.app.live2d

import android.graphics.PixelFormat
import android.opengl.GLSurfaceView
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

/**
 * Compose host for Cubism: [GLSurfaceView] + EGL 2, continuous render.
 */
@Composable
fun Live2dSurface(
    spec: Live2dModelSpec,
    modifier: Modifier = Modifier,
    onError: (Throwable) -> Unit = {},
) {
    val runtime = remember { createLive2dRuntime() }
    val lifecycleOwner = LocalLifecycleOwner.current
    val viewHolder = remember { arrayOfNulls<Live2dGlSurfaceView>(1) }

    AndroidView(
        modifier = modifier,
        factory = { context ->
            Live2dGlSurfaceView(context, runtime, onError).also { created ->
                created.bind(spec)
                viewHolder[0] = created
            }
        },
        update = { view -> view.bind(spec) },
        onRelease = { view ->
            view.release()
            viewHolder[0] = null
        },
    )

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> viewHolder[0]?.onResume()
                Lifecycle.Event.ON_PAUSE -> viewHolder[0]?.onPause()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
}

internal class Live2dGlSurfaceView(
    context: android.content.Context,
    private val runtime: Live2dRuntime,
    private val onError: (Throwable) -> Unit,
) : GLSurfaceView(context) {
    @Volatile
    private var spec: Live2dModelSpec? = null

    init {
        setEGLContextClientVersion(2)
        setEGLConfigChooser(8, 8, 8, 8, 16, 0)
        holder.setFormat(PixelFormat.TRANSLUCENT)
        preserveEGLContextOnPause = true
        setRenderer(Renderer())
        renderMode = RENDERMODE_CONTINUOUSLY
    }

    fun bind(next: Live2dModelSpec) {
        spec = next
    }

    fun release() {
        queueEvent {
            runCatching { runtime.dispose() }
                .onFailure { Log.w(TAG, "dispose failed", it) }
        }
        onPause()
    }

    private inner class Renderer : GLSurfaceView.Renderer {
        private var attachedPath: String? = null

        override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
            try {
                runtime.startUp(context)
                runtime.initializeGl(1, 1)
                attachedPath = null
            } catch (error: Throwable) {
                Log.e(TAG, "initialize failed", error)
                post { onError(error) }
            }
        }

        override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
            try {
                runtime.resize(width, height)
            } catch (error: Throwable) {
                Log.e(TAG, "resize failed", error)
                post { onError(error) }
            }
        }

        override fun onDrawFrame(gl: GL10?) {
            val current = spec
            try {
                if (current != null && current.model3Path != attachedPath) {
                    runtime.attachModel(context, current)
                    attachedPath = current.model3Path
                }
                runtime.onDrawFrame()
            } catch (error: Throwable) {
                Log.e(TAG, "draw failed", error)
                attachedPath = null
                post { onError(error) }
            }
        }
    }

    private companion object {
        const val TAG = "TouyaLive2D"
    }
}
