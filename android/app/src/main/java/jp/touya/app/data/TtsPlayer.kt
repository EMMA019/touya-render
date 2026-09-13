package jp.touya.app.data

import android.media.MediaPlayer
import java.io.File

/** Plays on-demand key-line audio from `/api/tts`. Chat does not depend on this. */
class TtsPlayer(private val cacheDir: File) {
    private var player: MediaPlayer? = null

    fun play(bytes: ByteArray, mime: String) {
        stop()
        val ext = if (mime.contains("wav", ignoreCase = true)) "wav" else "mp3"
        val file = File(cacheDir, "touya-tts.$ext")
        file.writeBytes(bytes)
        player = MediaPlayer().apply {
            setDataSource(file.absolutePath)
            setOnCompletionListener { releaseQuiet() }
            setOnErrorListener { _, _, _ ->
                releaseQuiet()
                true
            }
            prepare()
            start()
        }
    }

    fun stop() {
        releaseQuiet()
    }

    private fun releaseQuiet() {
        runCatching {
            player?.stop()
            player?.release()
        }
        player = null
    }
}
