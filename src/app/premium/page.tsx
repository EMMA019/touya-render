import Link from "next/link";
import { FREE_DAILY_TURNS, PREMIUM_DAILY_TURNS, REWARD_EXTRA_TURNS } from "@/lib/config";
import { PREMIUM_HEADING, PREMIUM_LEAD } from "@/lib/product-copy";

export default function PremiumPage() {
  return (
    <div className="night-canvas flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
        <p className="text-[11px] tracking-[0.28em] text-amber-100/50 uppercase">とうや</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-amber-50">{PREMIUM_HEADING}</h1>
        <p className="text-sm leading-relaxed text-amber-50/75">{PREMIUM_LEAD}</p>
        <ul className="space-y-3 text-sm text-amber-50/80">
          <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            無料プラン：1日{FREE_DAILY_TURNS}通まで（バナー広告表示あり）。短い広告を視聴することで、当日分を{REWARD_EXTRA_TURNS}通追加できます（1日最大2回まで）。
          </li>
          <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            広告なしプラン：1日{PREMIUM_DAILY_TURNS}通まで会話可能。お名前やメールアドレスの登録は一切不要です。
          </li>
          <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            ※ アプリ内課金機能は現在 Android 版向けに準備中です。Web 版は広告視聴とリワードで引き続きお楽しみいただけます。
          </li>
        </ul>
        <Link href="/" className="text-xs text-amber-100/50 underline-offset-2 hover:underline">
          一覧に戻る
        </Link>
      </main>
    </div>
  );
}
