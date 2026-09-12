package jp.touya.app.data

/**
 * Google Play Billing stub.
 *
 * Later: one-time or cheap subscription that raises the daily cap
 * and/or hides AdMob banners. Play account stays on Google's side.
 * This app still collects no PII and has no email/password signup.
 */
object BillingStub {
    const val PRODUCT_PREMIUM = "touya_premium_stub"

    fun isPremiumLocal(): Boolean = false
}
