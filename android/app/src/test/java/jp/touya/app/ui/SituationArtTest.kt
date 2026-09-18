package jp.touya.app.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SituationArtTest {
    @Test
    fun mapsPngAndMp4UnderSituationsToAssetUris() {
        assertEquals(
            "file:///android_asset/situations/hiyori/cafe-rain.png",
            situationAssetModel("/situations/hiyori/cafe-rain.png"),
        )
        assertEquals(
            "situations/hiyori/cafe-rain.mp4",
            situationRelativePath("/situations/hiyori/cafe-rain.mp4"),
        )
        assertEquals(
            "asset:///situations/hiyori/cafe-rain.mp4",
            situationMedia3AssetUri("situations/hiyori/cafe-rain.mp4"),
        )
    }

    @Test
    fun ignoresNonSituationAndRemotePathsForAssets() {
        assertNull(situationAssetModel(null))
        assertNull(situationAssetModel(""))
        assertNull(situationAssetModel("/portraits/hiyori.png"))
        assertNull(situationAssetModel("https://touya.onrender.com/situations/hiyori/cafe-rain.mp4"))
        assertNull(situationRelativePath("https://cdn.example/x.mp4"))
    }

    @Test
    fun videoWinsOverLive2dWhenBothArePossible() {
        assertEquals(ChatArtKind.VIDEO, resolveChatArtKind(videoResolved = true, live2dEligible = true))
        assertEquals(ChatArtKind.VIDEO, resolveChatArtKind(videoResolved = true, live2dEligible = false))
        assertEquals(ChatArtKind.LIVE2D, resolveChatArtKind(videoResolved = false, live2dEligible = true))
        assertEquals(ChatArtKind.STILL, resolveChatArtKind(videoResolved = false, live2dEligible = false))
    }

    @Test
    fun resolvesExplicitAssetThenConventionDropIn() {
        val assets = setOf("situations/hiyori/cafe-rain.mp4", "situations/hiyori/maid.mp4")
        val available = { path: String -> path in assets }

        assertEquals(
            "asset:///situations/hiyori/cafe-rain.mp4",
            resolveSituationVideoUri(
                explicit = "/situations/hiyori/cafe-rain.mp4",
                characterId = "hiyori",
                situationId = "cafe-rain",
                assetAvailable = available,
            ),
        )
        assertEquals(
            "asset:///situations/hiyori/maid.mp4",
            resolveSituationVideoUri(
                explicit = null,
                characterId = "hiyori",
                situationId = "maid",
                assetAvailable = available,
            ),
        )
        assertNull(
            resolveSituationVideoUri(
                explicit = null,
                characterId = "hiyori",
                situationId = "rainy-walk",
                assetAvailable = available,
            ),
        )
    }

    @Test
    fun explicitHttpsAndApiPathsStayPlayableWithoutLocalFile() {
        assertEquals(
            "https://cdn.example/loop.mp4",
            resolveSituationVideoUri(explicit = "https://cdn.example/loop.mp4"),
        )
        val remote = resolveSituationVideoUri(
            explicit = "/situations/hiyori/cafe-rain.mp4",
            characterId = "hiyori",
            situationId = "cafe-rain",
            assetAvailable = { false },
        )
        assertEquals("https://touya.onrender.com/situations/hiyori/cafe-rain.mp4", remote)
    }

    @Test
    fun pngOnlyInstallResolvesNothing() {
        assertNull(
            resolveSituationVideoUri(
                explicit = null,
                characterId = "hiyori",
                situationId = "cafe-rain",
                assetAvailable = { false },
            ),
        )
        assertNull(resolveSituationVideoUri(explicit = "   "))
    }
}
