package jp.touya.app.live2d

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ArtModeTest {
    @Test
    fun defaultIsStill() {
        assertEquals(
            ChatArtMode.STILL,
            resolveChatArtMode(Live2dGate(sdkPresent = false, flagOn = false, modelPresent = false)),
        )
        assertEquals(
            ChatArtMode.STILL,
            resolveChatArtMode(Live2dGate(sdkPresent = true, flagOn = false, modelPresent = true)),
        )
        assertEquals(
            ChatArtMode.STILL,
            resolveChatArtMode(Live2dGate(sdkPresent = true, flagOn = true, modelPresent = false)),
        )
    }

    @Test
    fun live2dOnlyWhenSdkFlagAndModel() {
        assertEquals(
            ChatArtMode.LIVE2D,
            resolveChatArtMode(Live2dGate(sdkPresent = true, flagOn = true, modelPresent = true)),
        )
    }

    @Test
    fun rosterIsClosedAndHiyoriMapsToOfficialSample() {
        assertEquals(
            setOf("hiyori", "clara", "rione", "shiraishi"),
            Live2dRoster.FIXED_IDS,
        )
        assertEquals("Hiyori", Live2dRoster.sampleFolder("hiyori"))
        assertEquals(null, Live2dRoster.sampleFolder("clara"))
        assertTrue(live2dAssetCandidates("unknown", "cafe").isEmpty())
    }

    @Test
    fun hiyoriCandidatesStayClosedList() {
        val paths = live2dAssetCandidates("hiyori", "cafe-rain")
        assertEquals(
            listOf(
                "live2d/hiyori/cafe-rain/cafe-rain.model3.json",
                "live2d/hiyori/hiyori.model3.json",
                "live2d/Hiyori/Hiyori.model3.json",
                "Hiyori/Hiyori.model3.json",
            ),
            paths,
        )
        val spec = specFromAssetPath("hiyori", "cafe-rain", "live2d/Hiyori/Hiyori.model3.json")
        assertEquals("live2d/Hiyori/", spec.assetDir)
        assertEquals("Hiyori.model3.json", spec.model3Json)
        assertEquals("live2d/Hiyori/Hiyori.model3.json", spec.model3Path)
    }

    @Test
    fun otherRosterCharactersDoNotUseHiyoriSample() {
        val paths = live2dAssetCandidates("clara", "terrace")
        assertFalse(paths.any { it.contains("Hiyori") })
        assertTrue(paths.contains("live2d/clara/clara.model3.json"))
    }
}
