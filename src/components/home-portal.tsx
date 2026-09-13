"use client";

import { PortalSidebar } from "@/components/portal-sidebar";
import { PortalBannerHero } from "@/components/portal-banner-hero";
import { CharacterPortalCard } from "@/components/character-portal-card";
import { DailyBanner } from "@/components/daily-banner";
import { SituationCardGrid } from "@/components/situation-card-grid";
import { RecentChatBar } from "@/components/recent-chat-bar";
import { DifferenceNotes } from "@/components/difference-notes";
import { SiteQuota } from "@/components/site-quota";
import { apiUrl } from "@/lib/api-base";
import { anonymousHeaders } from "@/lib/anonymous-client";
import type { CharacterPublic } from "@/lib/character-types";
import type { DailyPick, DailyPublic } from "@/lib/daily";
import Link from "next/link";
import { Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function HomePortal({
  initialCharacters,
  initialDaily = null,
}: {
  initialCharacters: CharacterPublic[];
  initialDaily?: DailyPick | DailyPublic | null;
}) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [daily, setDaily] = useState<DailyPick | DailyPublic | null>(initialDaily);

  useEffect(() => {
    void fetch(apiUrl("/api/characters"), { headers: anonymousHeaders() })
      .then((response) => response.json())
      .then((body: { characters?: CharacterPublic[]; daily?: DailyPublic | null }) => {
        if (Array.isArray(body.characters) && body.characters.length > 0) {
          setCharacters(body.characters);
        }
        if (body.daily?.characterId && body.daily.situationId) {
          setDaily(body.daily);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0e0814] text-amber-50">
      <PortalSidebar className="hidden md:flex w-60 shrink-0 sticky top-0 h-screen" />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-[#0e0814]/80 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400/20 to-rose-400/20 border border-amber-300/30">
              <Moon className="size-3.5 text-amber-200" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-base font-bold text-amber-50">
              燈夜
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs text-amber-100/70">
            <span className="font-semibold text-amber-200 border-b-2 border-amber-300 pb-1">
              ホーム
            </span>
            <Link href="/policy" className="hover:text-amber-100 transition">
              安心の約束
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <SiteQuota />
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 max-w-6xl w-full mx-auto space-y-7 pb-36">
          <DailyBanner daily={daily} />
          <SituationCardGrid roster={characters} />

          <PortalBannerHero />

          <section className="space-y-3" id="roster">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold tracking-tight text-amber-50">
                  名簿
                </h3>
                <p className="text-xs text-amber-100/50">
                  相手のプロフィールから入るとき。
                </p>
              </div>
            </div>

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

          <DifferenceNotes />

          <footer className="border-t border-white/5 pt-6 text-xs leading-relaxed text-amber-100/40 space-y-2">
            <p>
              登場人物はすべて大人のフィクションキャラクターです。未成年を連想させる表現や、成人向け・既定はSFW、NSFWは18歳確認後のみ。未成年や違法な内容は扱いません。
            </p>
            <p>
              お使いの端末に保存されるのは、ランダムに発行された匿名識別子と対話履歴のみです。お名前や連絡先などを取得することはありません。
            </p>
          </footer>
        </main>
      </div>

      <RecentChatBar roster={characters} />
    </div>
  );
}
