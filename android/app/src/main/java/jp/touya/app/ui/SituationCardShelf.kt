package jp.touya.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import jp.touya.app.data.CharacterPublic
import jp.touya.app.data.EMPTY_MODE
import jp.touya.app.data.Quota
import jp.touya.app.data.mediaUrl
import jp.touya.app.domain.ModePublic
import jp.touya.app.domain.ShelfTab
import jp.touya.app.domain.collectShelfCards
import jp.touya.app.domain.givenName
import jp.touya.app.domain.mediaForShelf
import jp.touya.app.domain.visibleShelfTabs

@Composable
fun SituationCardShelf(
    characters: List<CharacterPublic>,
    quota: Quota?,
    loading: Boolean,
    error: String?,
    opening: Boolean,
    onOpenCard: (CharacterPublic, String) -> Unit,
    onRetry: () -> Unit,
    onRoster: () -> Unit,
    onDiagnosis: () -> Unit,
    onPremium: () -> Unit,
    onPolicy: () -> Unit,
    mode: ModePublic = EMPTY_MODE,
    ageGateOpen: Boolean = false,
    onToggleMode: () -> Unit = {},
    onConfirmAge: () -> Unit = {},
    onCloseAgeGate: () -> Unit = {},
) {
    var characterId by remember { mutableStateOf<String?>(null) }
    var tab by remember { mutableStateOf(ShelfTab.ALL) }
    val tabs = remember(characters) { visibleShelfTabs(characters) }
    val cards = remember(characters, characterId, tab) {
        collectShelfCards(characters, characterId, tab)
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Color(0xFF0E0814))
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("とうや", style = MaterialTheme.typography.labelSmall, color = Color(0xFFD9C8B0))
                Text("燈夜", style = MaterialTheme.typography.headlineMedium, color = Color(0xFFF6EDE0))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ModeChip(mode, onClick = onToggleMode)
                QuotaPill(quota)
            }
        }
        Text("カード一覧", style = MaterialTheme.typography.titleMedium, color = Color(0xFFF6EDE0))
        Text(
            "場面を選ぶと、その相手とその場所で話せます。",
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFFD9C8B0),
        )

        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FilterAvatar(
                selected = characterId == null,
                label = "全員",
                onClick = { characterId = null },
            )
            characters.forEach { character ->
                FilterAvatar(
                    selected = characterId == character.id,
                    label = givenName(character.name),
                    image = mediaUrl(character.portraitImage),
                    onClick = {
                        characterId = if (characterId == character.id) null else character.id
                    },
                )
            }
        }

        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            tabs.forEach { item ->
                val selected = tab == item
                Surface(
                    onClick = { tab = item },
                    shape = CircleShape,
                    color = if (selected) Color.White else Color.White.copy(alpha = 0.08f),
                ) {
                    Text(
                        item.label,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (selected) Color(0xFF1C1917) else Color(0xFFF6EDE0),
                    )
                }
            }
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onRoster) { Text("名簿") }
            TextButton(onDiagnosis) { Text("今夜の相手診断") }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onPolicy) { Text("燈夜のこだわりと約束") }
            TextButton(onPremium) { Text("広告なしで話す") }
        }

        when {
            loading -> CircularProgressIndicator()
            error != null -> {
                Text(error, color = MaterialTheme.colorScheme.error)
                Button(onRetry) { Text("再読み込み") }
            }
            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
            ) {
                items(cards, key = { it.key }) { card ->
                    val art = mediaForShelf(card)
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF161020))
                            .clickable(enabled = !card.locked && !opening) {
                                onOpenCard(card.character, card.situation.id)
                            },
                    ) {
                        Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f)) {
                            if (art != null) {
                                AsyncImage(
                                    model = art,
                                    contentDescription = card.title,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop,
                                    alignment = Alignment.Center,
                                )
                            } else {
                                Box(
                                    Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.linearGradient(
                                                listOf(
                                                    parseHex(card.character.palette.from),
                                                    parseHex(card.character.palette.to),
                                                ),
                                            ),
                                        ),
                                )
                            }
                            Box(
                                Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(Color.Transparent, Color(0xE6120A16)),
                                        ),
                                    ),
                            )
                            if (card.locked) {
                                Column(
                                    Modifier
                                        .fillMaxSize()
                                        .background(Color.Black.copy(alpha = 0.55f)),
                                    verticalArrangement = Arrangement.Center,
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Text("🔒", color = Color(0xFFF6EDE0))
                                    Text(
                                        card.lockHint ?: "特別になってから",
                                        color = Color(0xFFF6EDE0),
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            }
                            Column(
                                Modifier
                                    .align(Alignment.BottomStart)
                                    .padding(6.dp),
                                verticalArrangement = Arrangement.spacedBy(2.dp),
                            ) {
                                Text(
                                    card.title,
                                    color = Color.White,
                                    style = MaterialTheme.typography.labelMedium,
                                    maxLines = 2,
                                )
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(
                                        card.givenName,
                                        color = Color(0xFFE8C48A),
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                    Text(
                                        affinityStars(card.affinity.level),
                                        color = Color(0xFFE8C48A),
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            }
                        }
                    }
                }
                item(span = { GridItemSpan(3) }) {
                    Text(
                        "登場人物はすべて大人のフィクションキャラクターです。",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFFD9C8B0),
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }
        }
        AgeGateDialog(open = ageGateOpen, onConfirm = onConfirmAge, onCancel = onCloseAgeGate)
    }
}

@Composable
private fun FilterAvatar(
    selected: Boolean,
    label: String,
    image: String? = null,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Box(
            Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(Color(0xFF2A2038))
                .then(
                    if (selected) {
                        Modifier.border(2.dp, Color(0xFFE8C48A), CircleShape)
                    } else {
                        Modifier.border(2.dp, Color.White.copy(alpha = 0.15f), CircleShape)
                    },
                ),
            contentAlignment = Alignment.Center,
        ) {
            if (image != null) {
                AsyncImage(
                    model = image,
                    contentDescription = label,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                    alignment = Alignment.TopCenter,
                )
            } else {
                Text("全", color = Color(0xFFF6EDE0), style = MaterialTheme.typography.labelSmall)
            }
        }
        Text(label, color = Color(0xFFD9C8B0), style = MaterialTheme.typography.labelSmall)
    }
}

private fun affinityStars(level: Int): String {
    val filled = level.coerceIn(0, 3)
    return "★".repeat(filled) + "☆".repeat(3 - filled)
}

private fun parseHex(hex: String): Color =
    runCatching { Color(android.graphics.Color.parseColor(hex.ifBlank { "#1a1020" })) }
        .getOrElse { Color(0xFF1A1020) }
