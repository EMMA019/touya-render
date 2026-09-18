package jp.touya.app.live2d

import android.content.Context
import android.util.Log

/**
 * Compile stub: Cubism Core / Framework are not on this machine.
 * Chat stays on still PNGs. Swap this file for `src/live2d/` when the SDK is present.
 */
class Live2dRuntimeImpl : Live2dRuntime {
    override val linked: Boolean = false

    override fun startUp(context: Context) {
        Log.i(TAG, "Live2D stub: Core/Framework not linked")
    }

    override fun initializeGl(width: Int, height: Int) = Unit

    override fun resize(width: Int, height: Int) = Unit

    override fun attachModel(context: Context, spec: Live2dModelSpec) = Unit

    override fun onDrawFrame() = Unit

    override fun dispose() = Unit

    private companion object {
        const val TAG = "TouyaLive2D"
    }
}
