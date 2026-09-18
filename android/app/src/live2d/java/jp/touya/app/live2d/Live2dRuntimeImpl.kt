package jp.touya.app.live2d

import android.content.Context
import android.opengl.GLES20
import android.util.Log
import com.live2d.sdk.cubism.core.ICubismLogger
import com.live2d.sdk.cubism.framework.CubismFramework
import com.live2d.sdk.cubism.framework.CubismFrameworkConfig
import com.live2d.sdk.cubism.framework.ICubismLoadFileFunction

/**
 * Official Cubism SDK for Java host.
 *
 * Lifecycle matches the docs / `LAppMinimumDelegate`:
 * [CubismFramework.startUp] on first use, [CubismFramework.initialize] on the
 * GL thread, [CubismFramework.dispose] when the view is released.
 *
 * Written against Cubism 5.x Java Framework (`CubismRendererAndroid.create(w, h)`).
 * If a drop-in SDK fails to compile, see android/LIVE2D.md.
 */
class Live2dRuntimeImpl : Live2dRuntime {
    override val linked: Boolean = true

    private var session: TouyaCubismSession? = null
    private var width: Int = 1
    private var height: Int = 1
    private var started: Boolean = false

    override fun startUp(context: Context) {
        if (started && CubismFramework.isStarted()) return
        val option = CubismFramework.Option()
        option.logFunction = ICubismLogger { message -> Log.i(TAG, message ?: "") }
        option.loggingLevel = CubismFrameworkConfig.LogLevel.INFO
        option.loadFileFunction = ICubismLoadFileFunction { path ->
            loadAssetBytes(context, path)
        }
        CubismFramework.cleanUp()
        CubismFramework.startUp(option)
        started = true
    }

    override fun initializeGl(width: Int, height: Int) {
        this.width = width.coerceAtLeast(1)
        this.height = height.coerceAtLeast(1)
        GLES20.glEnable(GLES20.GL_BLEND)
        GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE_MINUS_SRC_ALPHA)
        if (!CubismFramework.isInitialized()) {
            CubismFramework.initialize()
        }
    }

    override fun resize(width: Int, height: Int) {
        this.width = width.coerceAtLeast(1)
        this.height = height.coerceAtLeast(1)
        GLES20.glViewport(0, 0, this.width, this.height)
        session?.resize(this.width, this.height)
    }

    override fun attachModel(context: Context, spec: Live2dModelSpec) {
        session?.close()
        session = TouyaCubismSession(context, spec).also {
            it.load(width, height)
        }
    }

    override fun onDrawFrame() {
        GLES20.glClearColor(0f, 0f, 0f, 0f)
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
        session?.drawFrame(width, height)
    }

    override fun dispose() {
        session?.close()
        session = null
        if (CubismFramework.isInitialized()) {
            CubismFramework.dispose()
        }
        CubismFramework.cleanUp()
        started = false
    }

    private companion object {
        const val TAG = "TouyaLive2D"
    }
}

internal fun loadAssetBytes(context: Context, path: String): ByteArray {
    val cleaned = path.removePrefix("/").removePrefix("assets/")
    return context.assets.open(cleaned).use { it.readBytes() }
}
