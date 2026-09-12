package jp.touya.app

import android.app.Application
import jp.touya.app.data.ChatStore
import jp.touya.app.data.TouyaClient
import jp.touya.app.data.VisitorStore

class TouyaApp : Application() {
    lateinit var client: TouyaClient
        private set
    lateinit var chatStore: ChatStore
        private set
    lateinit var visitorStore: VisitorStore
        private set

    override fun onCreate() {
        super.onCreate()
        visitorStore = VisitorStore(this)
        val installId = visitorStore.anonymousInstallId()
        client = TouyaClient(installId)
        chatStore = ChatStore(this)
    }
}
