import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { FREE_DAILY_TURNS, PREMIUM_DAILY_TURNS } from "@/lib/config";

export function PortalUpsellBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-[#241334] via-[#1a0e28] to-[#140b20] p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <Sparkles className="size-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-purple-100">
              もっと気兼ねなく、夜の会話を楽しみませんか？
            </h4>
            <p className="text-xs text-purple-200/70 leading-relaxed">
              無料枠は1日{FREE_DAILY_TURNS}通。広告なしプランなら1日{PREMIUM_DAILY_TURNS}通まで、広告表示なしでゆっくりとお話しいただけます。
            </p>
          </div>
        </div>

        <Link
          href="/premium"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:opacity-90 self-stretch sm:self-auto justify-center"
        >
          <span>プランを見る</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
