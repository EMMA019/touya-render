package jp.touya.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import jp.touya.app.ui.CharacterListScreen
import jp.touya.app.ui.ChatScreen
import jp.touya.app.ui.DiagnosisScreen
import jp.touya.app.ui.PolicyScreen
import jp.touya.app.ui.PremiumScreen
import jp.touya.app.ui.theme.TouyaTheme

class MainActivity : ComponentActivity() {
    private val viewModel: TouyaViewModel by viewModels {
        val app = application as TouyaApp
        TouyaViewModel.factory(app.client, app.chatStore, app.visitorStore)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TouyaTheme {
                val state by viewModel.state.collectAsState()
                when (val screen = state.screen) {
                    Screen.List -> CharacterListScreen(
                        characters = state.characters,
                        quota = state.quota,
                        loading = state.loading,
                        error = state.error,
                        opening = state.opening,
                        onSelect = viewModel::open,
                        onRetry = viewModel::refresh,
                        onDiagnosis = viewModel::showDiagnosis,
                        onPremium = viewModel::showPremium,
                        onPolicy = viewModel::showPolicy,
                        mode = state.mode,
                        ageGateOpen = state.ageGateOpen,
                        onToggleMode = viewModel::toggleMode,
                        onConfirmAge = viewModel::confirmAgeAndEnableNsfw,
                        onCloseAgeGate = viewModel::closeAgeGate,
                    )
                    is Screen.Chat -> ChatScreen(
                        character = screen.character,
                        messages = state.messages,
                        input = state.input,
                        sending = state.sending,
                        quota = state.quota,
                        error = state.error,
                        situationId = state.situationId,
                        bond = state.bond,
                        affinity = state.affinity,
                        memory = state.memory,
                        unlocked = state.unlocked,
                        memoryOpen = state.memoryOpen,
                        feedbackSent = state.feedbackSent,
                        rewarding = state.rewarding,
                        rewardMessage = state.rewardMessage,
                        situationCard = state.situationCard,
                        onSituation = viewModel::setSituation,
                        onDismissCard = viewModel::dismissSituationCard,
                        onInput = viewModel::setInput,
                        onSend = viewModel::send,
                        onBack = viewModel::back,
                        onToggleMemory = viewModel::toggleMemory,
                        onForget = viewModel::forget,
                        onReportWrong = viewModel::reportWrong,
                        onReward = viewModel::watchReward,
                        onPremium = viewModel::showPremium,
                        mode = state.mode,
                        ageGateOpen = state.ageGateOpen,
                        levelUpMessage = state.levelUpMessage,
                        onToggleMode = viewModel::toggleMode,
                        onConfirmAge = viewModel::confirmAgeAndEnableNsfw,
                        onCloseAgeGate = viewModel::closeAgeGate,
                        onDismissLevelUp = viewModel::dismissLevelUp,
                    )
                    Screen.Diagnosis -> DiagnosisScreen(
                        characters = state.characters,
                        onSelect = viewModel::open,
                        onBack = viewModel::showList,
                    )
                    Screen.Premium -> PremiumScreen(onBack = viewModel::showList)
                    Screen.Policy -> PolicyScreen(onBack = viewModel::showList)
                }
            }
        }
    }
}
