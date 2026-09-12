package jp.touya.app.ui

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable

@Composable
fun AgeGateDialog(
    open: Boolean,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
) {
    if (!open) return
    AlertDialog(
        onDismissRequest = onCancel,
        title = { Text("18歳以上です") },
        text = { Text("確認は端末にだけ残します。") },
        confirmButton = {
            TextButton(onClick = onConfirm) { Text("続ける") }
        },
        dismissButton = {
            TextButton(onClick = onCancel) { Text("やめる") }
        },
    )
}
