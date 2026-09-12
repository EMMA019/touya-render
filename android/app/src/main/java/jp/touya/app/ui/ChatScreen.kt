package jp.touya.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import jp.touya.app.data.AffinityPublic
import jp.touya.app.data.Bond
import jp.touya.app.data.CharacterPublic
import jp.touya.app.data.ChatMessage
import jp.touya.app.data.EMPTY_AFFINITY
import jp.touya.app.data.MemoryRow
import jp.touya.app.data.EMPTY_MODE
import jp.touya.app.data.Quota
import jp.touya.app.data.SituationPublic
import jp.touya.app.data.situationCardLines
import jp.touya.app.domain.ModePublic
import jp.touya.app.domain.LOCKED_SITUATION_HINT
import jp.touya.app.domain.pickHook
import jp.touya.app.domain.suggestionsFor

@Composable
fun ChatScreen(
    character: CharacterPublic,
    messages: List<ChatMessage>,
    input: String,
    sending: Boolean,
    quota: Quota?,
    error: String?,
    situationId: String,
    bond: Bond,
    affinity: AffinityPublic = EMPTY_AFFINITY,
    memory: List<MemoryRow>,
    unlocked: List<String>,
    memoryOpen: Boolean,
    feedbackSent: Boolean,
    rewarding: Boolean,
    rewardMessage: String?,
    situationCard: Boolean,
    onSituation: (String) -> Unit,
    onDismissCard: () -> Unit,
    onInput: (String) -> Unit,
    onSend: (String) -> Unit,
    onBack: () -> Unit,
    onToggleMemory: (Boolean) -> Unit,
    onForget: (String) -> Unit,
    onReportWrong: () -> Unit,
    onReward: () -> Unit,
    onPremium: () -> Unit,
    mode: ModePublic = EMPTY_MODE,
    ageGateOpen: Boolean = false,
    onToggleMode: () -> Unit = {},
    onConfirmAge: () -> Unit = {},
    onCloseAgeGate: () -> Unit = {},
) {
    val limited = quota?.debugUnlimited != true && (quota?.remaining ?: 1) <= 0
    val situation = character.situations.firstOrNull { it.id == situationId }
        ?: character.situations.firstOrNull()
    val halloween = situation?.season == "halloween"
    val recent = messages.takeLast(5)
    val lastAssistant = messages.asReversed().firstOrNull { it.role == "assistant" && it.content.isNotBlank() }
    val hints = suggestionsFor(character.presence, bond.stage, character.suggestions)
    val from = remember(character.palette.from) { parseHex(character.palette.from) }
    val to = remember(character.palette.to) { parseHex(character.palette.to) }
    val sky = if (halloween) {
        listOf(Color(0xFF140C1C), Color(0xFF2C1428), Color(0xFF08060A))
    } else {
        listOf(from, to, Color(0xFF08060A))
    }

    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(sky))) {
        character.situationArt(situationId)?.let { art ->
            AsyncImage(
                model = art,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit,
                alignment = Alignment.Center,
            )
        }
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .imePadding()
                .navigationBarsPadding(),
        ) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                Text(
                    character.name,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(horizontal = 88.dp)
                        .fillMaxWidth(),
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(
                    Modifier.align(Alignment.CenterStart),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(
                        onClick = onBack,
                        colors = IconButtonDefaults.iconButtonColors(containerColor = Color.Black.copy(alpha = 0.4f)),
                    ) {
                        Icon(
                            Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "戻る",
                            tint = Color.White,
                        )
                    }
                    AffinityHeart(affinity)
                }
                ChatSettingsMenu(
                    modifier = Modifier.align(Alignment.CenterEnd),
                    mode = mode,
                    situations = character.situations,
                    situationId = situationId,
                    unlocked = unlocked,
                    onToggleMode = onToggleMode,
                    onOpenMemory = { onToggleMemory(true) },
                    onSituation = onSituation,
                )
            }

            ChatChromeTags(mode = mode, quota = quota)

            Row(
                Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                character.situations.forEach { scene ->
                    val open = unlocked.isEmpty() || scene.id in unlocked
                    val selected = scene.id == situationId
                    Surface(
                        onClick = { if (open) onSituation(scene.id) },
                        enabled = open,
                        shape = CircleShape,
                        color = when {
                            !open -> Color.Black.copy(alpha = 0.28f)
                            selected -> Color.White.copy(alpha = 0.92f)
                            else -> Color.Black.copy(alpha = 0.4f)
                        },
                    ) {
                        Text(
                            buildString {
                                append(if (open) scene.title else "🔒 ${scene.title}")
                                if (!open) append(" $LOCKED_SITUATION_HINT")
                            },
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            color = when {
                                !open -> Color.White.copy(alpha = 0.45f)
                                selected -> Color(0xFF1C1917)
                                else -> Color.White.copy(alpha = 0.85f)
                            },
                        )
                    }
                }
            }

            if (situationCard && situation != null) {
                Surface(
                    onClick = onDismissCard,
                    shape = RoundedCornerShape(16.dp),
                    color = Color.Black.copy(alpha = 0.55f),
                    modifier = Modifier
                        .padding(horizontal = 12.dp, vertical = 10.dp)
                        .fillMaxWidth(),
                ) {
                    Column(
                        Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text("SITUATION", color = Color.White.copy(alpha = 0.5f))
                        Text(situation.title, color = Color.White)
                        situationCardLines(situation, affinity.level).forEach { line ->
                            Text(line, color = Color.White.copy(alpha = 0.88f))
                        }
                        Text("タップして閉じる", color = Color.White.copy(alpha = 0.7f))
                    }
                }
            }

            Spacer(Modifier.weight(1f))

            Column(
                Modifier
                    .fillMaxWidth()
                    .height(260.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp, Alignment.Bottom),
            ) {
                recent.forEach { message ->
                    val mine = message.role == "user"
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start,
                    ) {
                        Text(
                            message.content + if (message.pending) "▍" else "",
                            modifier = Modifier
                                .fillMaxWidth(0.86f)
                                .background(
                                    if (mine) Color.White.copy(alpha = 0.9f) else Color.Black.copy(alpha = 0.45f),
                                    RoundedCornerShape(16.dp),
                                )
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            color = if (mine) Color(0xFF1C1917) else Color.White,
                        )
                    }
                }
                if (lastAssistant != null && lastAssistant.pending.not()) {
                    TextButton(onReportWrong) {
                        Text(
                            if (feedbackSent) "受け取った。直す材料にする。" else "違ったと感じた",
                            color = Color.White.copy(alpha = 0.45f),
                        )
                    }
                }
            }

            if (limited) {
                Column(
                    Modifier
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        .background(Color.Black.copy(alpha = 0.55f), RoundedCornerShape(16.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    val hook = pickHook(character.presence, "${character.id}-hook", "")
                    Text(
                        "「${character.farewell}${if (hook.isNotBlank()) " $hook" else ""}」",
                        color = Color.White,
                    )
                    if (mode.adsEnabled) {
                        if ((quota?.rewardsLeft ?: 0) <= 0) {
                            Text("今日のリワード広告はここまで。日本時間の0時に戻ります。", color = Color.White.copy(alpha = 0.55f))
                        } else {
                            Button(onReward, enabled = !rewarding, modifier = Modifier.fillMaxWidth()) {
                                Text(if (rewarding) "読み込み中…" else "広告を見て +3通（AdMob スタブ）")
                            }
                            Text(
                                "本番は AdMob リワード。今は完了扱いで通数だけ足します。アカウントは不要です。",
                                color = Color.White.copy(alpha = 0.5f),
                            )
                        }
                        if (rewardMessage != null) {
                            Text(rewardMessage, color = Color(0xFFE8C48A))
                        }
                        TextButton(onPremium, Modifier.fillMaxWidth()) {
                            Text("広告なしで話す", color = Color.White.copy(alpha = 0.65f))
                        }
                    }
                }
            }
            if (error != null) {
                Text(error, modifier = Modifier.padding(horizontal = 16.dp), color = Color(0xFFFFC9C9))
            }

            Row(
                Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                hints.forEach { hint ->
                    Surface(
                        onClick = { onSend(hint) },
                        enabled = !sending && !limited,
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.45f),
                    ) {
                        Text(
                            hint,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            color = Color.White.copy(alpha = 0.88f),
                        )
                    }
                }
            }

            Row(
                Modifier.padding(start = 12.dp, end = 12.dp, bottom = 16.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                OutlinedTextField(
                    value = input,
                    onValueChange = onInput,
                    modifier = Modifier.weight(1f),
                    enabled = !sending && !limited,
                    placeholder = { Text("…", color = Color.White.copy(alpha = 0.4f)) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedContainerColor = Color.Black.copy(alpha = 0.4f),
                        unfocusedContainerColor = Color.Black.copy(alpha = 0.4f),
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent,
                    ),
                    shape = CircleShape,
                )
                FilledIconButton(
                    onClick = { onSend(input) },
                    enabled = !sending && !limited && input.isNotBlank(),
                    modifier = Modifier.padding(start = 8.dp).size(48.dp),
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.White),
                ) {
                    Text("➤", color = Color(0xFF1C1917))
                }
            }
        }
        MemorySheet(
            open = memoryOpen,
            facts = memory,
            onClose = { onToggleMemory(false) },
            onForget = onForget,
        )
        AgeGateDialog(open = ageGateOpen, onConfirm = onConfirmAge, onCancel = onCloseAgeGate)
    }
}

@Composable
private fun ChatSettingsMenu(
    mode: ModePublic,
    situations: List<SituationPublic>,
    situationId: String,
    unlocked: List<String>,
    onToggleMode: () -> Unit,
    onOpenMemory: () -> Unit,
    onSituation: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var menuOpen by remember { mutableStateOf(false) }
    Box(modifier) {
        IconButton(
            onClick = { menuOpen = true },
            colors = IconButtonDefaults.iconButtonColors(containerColor = Color.Black.copy(alpha = 0.4f)),
        ) {
            Icon(
                Icons.Outlined.Settings,
                contentDescription = "設定",
                tint = Color.White,
            )
        }
        DropdownMenu(
            expanded = menuOpen,
            onDismissRequest = { menuOpen = false },
        ) {
            DropdownMenuItem(
                text = {
                    Text(if (mode.nsfw) "SFWに切り替える" else "NSFWに切り替える")
                },
                trailingIcon = {
                    Text(if (mode.nsfw) "NSFW" else "SFW")
                },
                onClick = {
                    menuOpen = false
                    onToggleMode()
                },
            )
            DropdownMenuItem(
                text = { Text("記憶") },
                onClick = {
                    menuOpen = false
                    onOpenMemory()
                },
            )
            HorizontalDivider()
            Text(
                "シチュエーション",
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            situations.forEach { scene ->
                val open = unlocked.isEmpty() || scene.id in unlocked
                val selected = scene.id == situationId
                DropdownMenuItem(
                    text = {
                        Text(
                            buildString {
                                append(if (open) scene.title else "🔒 ${scene.title}")
                                if (selected) append("  ✓")
                            },
                        )
                    },
                    enabled = open,
                    onClick = {
                        menuOpen = false
                        onSituation(scene.id)
                    },
                )
            }
        }
    }
}

@Composable
private fun ChatChromeTags(mode: ModePublic, quota: Quota?) {
    val debug = quota?.debugUnlimited == true
    if (!mode.nsfw && quota == null) return
    Row(
        Modifier.padding(start = 12.dp, end = 12.dp, bottom = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (mode.nsfw) {
            Surface(shape = CircleShape, color = Color(0x33FB7185)) {
                Text(
                    "NSFW",
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFFFFE4E6),
                )
            }
        }
        if (debug) {
            Surface(shape = CircleShape, color = Color(0x3322C55E)) {
                Text(
                    "DEBUG",
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFFD9F99D),
                )
            }
        } else if (quota != null) {
            Surface(shape = CircleShape, color = Color.Black.copy(alpha = 0.35f)) {
                Text(
                    "残り ${quota.remaining}",
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.72f),
                )
            }
        }
    }
}

private fun parseHex(hex: String): Color {
    return runCatching {
        Color(android.graphics.Color.parseColor(hex.ifBlank { "#1a1020" }))
    }.getOrElse { Color(0xFF1A1020) }
}
