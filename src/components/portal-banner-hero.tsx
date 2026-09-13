import Link from "next/link";
import { Sparkles, Coffee, Briefcase, Moon, Sunset } from "lucide-react";
import { LANDING_HEADLINE } from "@/lib/product-copy";

export function PortalBannerHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#2a1324] via-[#1d1226] to-[#120a16] p-6 shadow-2xl">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 size-64 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-xl space-y-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
            <Sparkles className="size-3 text-amber-300" />
            <span>秋の夜長に寄り添う4人の相手</span>
          </div>

          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-amber-50 md:text-3xl">
            {LANDING_HEADLINE}
          </h2>

          <p className="text-xs leading-relaxed text-amber-100/70 md:text-sm">
            雨のカフェ、明かりを落としたオフィス、夜風が抜ける屋上、黄昏のテラス。
            今のあなたの気分に寄り添う相手と、静かな時間をお過ごしください。
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/policy"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-amber-100/80 transition hover:bg-white/10"
            >
              <span>燈夜のこだわりと安心</span>
            </Link>
          </div>
        </div>

        {/* Small atmosphere tags pill */}
        <div className="hidden lg:grid grid-cols-2 gap-2 text-[11px] text-amber-100/70">
          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
            <Coffee className="size-3.5 text-rose-300" />
            <span>雨のカフェ</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
            <Briefcase className="size-3.5 text-amber-300" />
            <span>終業後のオフィス</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
            <Moon className="size-3.5 text-indigo-300" />
            <span>夜の屋上</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
            <Sunset className="size-3.5 text-pink-300" />
            <span>黄昏のテラス</span>
          </div>
        </div>
      </div>
    </div>
  );
}
