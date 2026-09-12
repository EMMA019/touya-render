import { AdSlot } from "@/components/ad-slot";
import { PortalSidebar } from "@/components/portal-sidebar";
import { PortalBannerHero } from "@/components/portal-banner-hero";
import { PortalUpsellBanner } from "@/components/portal-upsell-banner";
import { CharacterPortalCard } from "@/components/character-portal-card";
import { SituationCardGrid } from "@/components/situation-card-grid";
import { RecentChatBar } from "@/components/recent-chat-bar";
import { DifferenceNotes } from "@/components/difference-notes";
import { SiteQuota } from "@/components/site-quota";
import { listPublicCharactersForVisitor } from "@/lib/characters";
import { getVisitorId } from "@/lib/visitor";
import Link from "next/link";
import { Compass, Moon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const visitorId = await getVisitorId();
  const characters = await listPublicCharactersForVisitor(visitorId);

  return (
    <div className="flex min-h-screen bg-[#0e0814] text-amber-50">
      {/* Desktop Left Sidebar (OzChat-like layout) */}
      <PortalSidebar className="hidden md:flex w-60 shrink-0 sticky top-0 h-screen" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-[#0e0814]/80 px-4 sm:px-6 backdrop-blur-md">
          {/* Mobile brand logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400/20 to-rose-400/20 border border-amber-300/30">
              <Moon className="size-3.5 text-amber-200" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-base font-bold text-amber-50">
              燈夜
            </span>
          </div>

          {/* Desktop tabs / subtitle */}
          <div className="hidden md:flex items-center gap-6 text-xs text-amber-100/70">
            <span className="font-semibold text-amber-200 border-b-2 border-amber-300 pb-1">
              ホーム
            </span>
            <Link href="/diag" className="hover:text-amber-100 transition flex items-center gap-1">
              <Compass className="size-3 text-amber-300" />
              <span>今夜の相手診断</span>
            </Link>
            <Link href="/premium" className="hover:text-amber-100 transition">
              プラン案内
            </Link>
            <Link href="/policy" className="hover:text-amber-100 transition">
              安心の約束
            </Link>
          </div>

          {/* Right Action: Quota Pill */}
          <div className="flex items-center gap-3">
            <SiteQuota />
          </div>
        </header>

        {/* Scrollable Main Body */}
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-6xl w-full mx-auto space-y-7 pb-24">
          <AdSlot placement="banner" />

          {/* Hero Banner Carousel/Pickup */}
          <PortalBannerHero />

          {/* Character Card Grid (Primary 4 anime companions) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold tracking-tight text-amber-50">
                  今夜の相手を選ぶ
                </h3>
                <p className="text-xs text-amber-100/50">
                  4人の女性コンパニオン。今の気分に合う人を選んでお話しください。
                </p>
              </div>
              <Link
                href="/diag"
                className="text-xs text-rose-300 hover:text-rose-200 underline-offset-4 hover:underline"
              >
                迷ったら診断する →
              </Link>
            </div>

            {/* 4 Cards Grid - OzChat aspect ratio */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {characters.map((character, index) => (
                <CharacterPortalCard
                  key={character.id}
                  character={character}
                  rank={index + 1}
                  badge="公式"
                />
              ))}
            </div>
          </section>

          {/* Mid-page Upsell Promotion (OzChat-like purple bar) */}
          <PortalUpsellBanner />

          {/* Situation & Costume Card Showcase */}
          <SituationCardGrid roster={characters} />

          {/* Difference & Safety Notes */}
          <DifferenceNotes />

          {/* Footer Notice */}
          <footer className="border-t border-white/5 pt-6 text-xs leading-relaxed text-amber-100/40 space-y-2">
            <p>
              登場人物はすべて大人のフィクションキャラクターです。未成年を連想させる表現や、成人向け・NSFWコンテンツは取り扱っておりません。
            </p>
            <p>
              お使いの端末に保存されるのは、ランダムに発行された匿名識別子と対話履歴のみです。お名前や連絡先などを取得することはありません。
            </p>
            <p>
              無料の会話可能数は日本時間の毎日午前0時にリセットされます。リワード広告をご覧いただくことで、当日分の会話数を増やすことができます。
            </p>
          </footer>
        </main>
      </div>

      {/* Floating mini-player bar for returning users to resume recent chat */}
      <RecentChatBar roster={characters} />
    </div>
  );
}
