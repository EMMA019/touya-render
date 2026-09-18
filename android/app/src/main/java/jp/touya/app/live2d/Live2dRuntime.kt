package jp.touya.app.live2d

import android.content.Context

/**
 * Cubism host used by the Compose [android.opengl.GLSurfaceView] shell.
 *
 * Main source never imports `com.live2d.sdk.cubism.*`. The real
 * implementation lives in `src/live2d/` and is compiled only when Core +
 * Framework are dropped in. Otherwise [Live2dRuntimeImpl] is the stub.
 */
interface Live2dRuntime {
    val linked: Boolean

    fun startUp(context: Context)

    fun initializeGl(width: Int, height: Int)

    fun resize(width: Int, height: Int)

    fun attachModel(context: Context, spec: Live2dModelSpec)

    fun onDrawFrame()

    fun dispose()
}

fun createLive2dRuntime(): Live2dRuntime = Live2dRuntimeImpl()
