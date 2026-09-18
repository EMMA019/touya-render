package jp.touya.app.live2d

import android.content.Context
import android.graphics.BitmapFactory
import android.opengl.GLES20
import android.opengl.GLUtils
import android.util.Log
import com.live2d.sdk.cubism.framework.CubismDefaultParameterId
import com.live2d.sdk.cubism.framework.CubismFramework
import com.live2d.sdk.cubism.framework.CubismModelSettingJson
import com.live2d.sdk.cubism.framework.ICubismModelSetting
import com.live2d.sdk.cubism.framework.effect.CubismBreath
import com.live2d.sdk.cubism.framework.effect.CubismEyeBlink
import com.live2d.sdk.cubism.framework.math.CubismMatrix44
import com.live2d.sdk.cubism.framework.model.CubismUserModel
import com.live2d.sdk.cubism.framework.motion.ACubismMotion
import com.live2d.sdk.cubism.framework.motion.CubismMotion
import com.live2d.sdk.cubism.framework.rendering.android.CubismRendererAndroid

/**
 * Thin CubismUserModel for the official sample spike: load `.model3.json`,
 * textures, Idle motion if present, auto blink + breath.
 */
internal class TouyaCubismSession(
    private val context: Context,
    private val spec: Live2dModelSpec,
) : CubismUserModel() {
    private val motions = HashMap<String, ACubismMotion>()
    private var lastNs: Long = 0L
    private var viewWidth: Int = 1
    private var viewHeight: Int = 1

    fun load(width: Int, height: Int) {
        viewWidth = width.coerceAtLeast(1)
        viewHeight = height.coerceAtLeast(1)
        val json = loadAssetBytes(context, spec.model3Path)
        val modelSetting = CubismModelSettingJson(json)

        val mocName = modelSetting.modelFileName
        if (mocName.isNullOrEmpty()) {
            error("model3.json has no moc3: ${spec.model3Path}")
        }
        loadModel(loadAssetBytes(context, spec.assetDir + mocName))

        val blink = CubismEyeBlink.create(modelSetting)
        eyeBlink = blink
        breath = defaultBreath()

        preloadIdle(modelSetting)
        setupRenderer(CubismRendererAndroid.create(viewWidth, viewHeight))
        bindTextures(modelSetting)
        motionManager.stopAllMotions()
        isInitialized(true)
        lastNs = System.nanoTime()
        Log.i(TAG, "loaded ${spec.model3Path}")
    }

    fun resize(width: Int, height: Int) {
        viewWidth = width.coerceAtLeast(1)
        viewHeight = height.coerceAtLeast(1)
        setRenderTargetSize(viewWidth, viewHeight)
    }

    fun drawFrame(width: Int, height: Int) {
        if (model == null || !isInitialized) return
        viewWidth = width.coerceAtLeast(1)
        viewHeight = height.coerceAtLeast(1)
        val now = System.nanoTime()
        val dt = ((now - lastNs).coerceAtLeast(0L) / 1_000_000_000f).coerceIn(0f, 0.1f)
        lastNs = now

        model.loadParameters()
        if (motionManager.isFinished) {
            startIdle()
        } else {
            motionManager.updateMotion(model, dt)
        }
        model.saveParameters()

        eyeBlink?.updateParameters(model, dt)
        breath?.updateParameters(model, dt)
        model.update()

        val projection = CubismMatrix44.create()
        val aspect = viewWidth.toFloat() / viewHeight.toFloat()
        if (aspect > 1f) {
            projection.scale(1f / aspect, 1f)
        } else {
            projection.scale(1f, aspect)
        }
        projection.scaleRelative(2.0f, 2.0f)
        CubismMatrix44.multiply(
            modelMatrix.array,
            projection.array,
            projection.array,
        )
        val renderer = getRenderer<CubismRendererAndroid>()
        renderer.setMvpMatrix(projection)
        renderer.drawModel()
    }

    fun close() {
        runCatching { delete() }
        isInitialized(false)
    }

    private fun preloadIdle(modelSetting: ICubismModelSetting) {
        val groupCount = modelSetting.motionGroupCount
        for (g in 0 until groupCount) {
            val group = modelSetting.getMotionGroupName(g) ?: continue
            if (!group.equals(IDLE_GROUP, ignoreCase = true)) continue
            val count = modelSetting.getMotionCount(group)
            for (i in 0 until count) {
                val file = modelSetting.getMotionFileName(group, i)
                if (file.isNullOrEmpty()) continue
                val motion = loadMotion(loadAssetBytes(context, spec.assetDir + file)) ?: continue
                val fadeIn = modelSetting.getMotionFadeInTimeValue(group, i)
                if (fadeIn != -1f) motion.setFadeInTime(fadeIn)
                val fadeOut = modelSetting.getMotionFadeOutTimeValue(group, i)
                if (fadeOut != -1f) motion.setFadeOutTime(fadeOut)
                motions["${group}_$i"] = motion
            }
        }
    }

    private fun startIdle() {
        val idle = motions.entries.firstOrNull { it.key.startsWith("Idle_", ignoreCase = true) }
            ?: motions.entries.firstOrNull()
            ?: return
        val motion = idle.value as? CubismMotion ?: return
        motionManager.startMotionPriority(motion, IDLE_PRIORITY)
    }

    private fun bindTextures(modelSetting: ICubismModelSetting) {
        val renderer = getRenderer<CubismRendererAndroid>()
        renderer.isPremultipliedAlpha(true)
        for (i in 0 until modelSetting.textureCount) {
            val name = modelSetting.getTextureFileName(i)
            if (name.isNullOrEmpty()) continue
            renderer.bindTexture(i, loadGlTexture(spec.assetDir + name))
        }
    }

    private fun loadGlTexture(assetPath: String): Int {
        val opts = BitmapFactory.Options().apply { inPremultiplied = true }
        val bitmap = context.assets.open(assetPath).use { BitmapFactory.decodeStream(it, null, opts) }
            ?: error("texture missing: $assetPath")
        val ids = IntArray(1)
        GLES20.glGenTextures(1, ids, 0)
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, ids[0])
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
        GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bitmap, 0)
        bitmap.recycle()
        return ids[0]
    }

    private fun defaultBreath(): CubismBreath {
        val ids = CubismFramework.getIdManager()
        val breath = CubismBreath.create()
        breath.setParameters(
            listOf(
                CubismBreath.BreathParameterData(
                    ids.getId(CubismDefaultParameterId.ParameterId.ANGLE_X.id),
                    0f, 15f, 6.5345f, 0.5f,
                ),
                CubismBreath.BreathParameterData(
                    ids.getId(CubismDefaultParameterId.ParameterId.ANGLE_Y.id),
                    0f, 8f, 3.5345f, 0.5f,
                ),
                CubismBreath.BreathParameterData(
                    ids.getId(CubismDefaultParameterId.ParameterId.ANGLE_Z.id),
                    0f, 10f, 5.5345f, 0.5f,
                ),
                CubismBreath.BreathParameterData(
                    ids.getId(CubismDefaultParameterId.ParameterId.BODY_ANGLE_X.id),
                    0f, 4f, 15.5345f, 0.5f,
                ),
                CubismBreath.BreathParameterData(
                    ids.getId(CubismDefaultParameterId.ParameterId.BREATH.id),
                    0.5f, 0.5f, 3.2345f, 0.5f,
                ),
            ),
        )
        return breath
    }

    private companion object {
        const val TAG = "TouyaLive2D"
        const val IDLE_GROUP = "Idle"
        const val IDLE_PRIORITY = 1
    }
}
