"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Compass,
  Crown,
  Moon,
  Info,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { APP_NAME, APP_NAME_KANA } from "@/lib/config";
import { cn } from "@/lib/utils";

export function PortalSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { href: "/", label: "ホーム", icon: Home, active: pathname === "/" },
    { href: "/diag", label: "相手診断", icon: Compass, active: pathname === "/diag" },
    { href: "/premium", label: "広告なし", icon: Crown, active: pathname === "/premium" },
    { href: "/policy", label: "約束と安心", icon: ShieldCheck, active: pathname === "/policy" },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-white/10 bg-[#120a16]/95 backdrop-blur-xl",
        className
      )}
    >
      {/* Brand logo header */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-rose-400/20 border border-amber-300/30 shadow-[0_0_16px_rgba(232,196,138,0.2)]">
          <Moon className="size-4 text-amber-200" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-amber-50">
              {APP_NAME}
            </span>
            <span className="text-[10px] tracking-widest text-amber-200/50 uppercase">
              {APP_NAME_KANA}
            </span>
          </div>
          <p className="text-[10px] text-amber-100/40">夜のコンパニオン</p>
        </div>
      </div>

      {/* Main navigation list */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                item.active
                  ? "bg-amber-200/15 text-amber-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-amber-200/20"
                  : "text-amber-100/60 hover:bg-white/5 hover:text-amber-100"
              )}
            >
              <Icon className={cn("size-4", item.active ? "text-amber-300" : "opacity-70")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer info */}
      <div className="border-t border-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-2.5 py-2">
          <span className="text-[10px] text-amber-100/45">モード</span>
          <ModeToggle />
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-amber-200/80">
            <Info className="size-3 text-amber-300" />
            <span className="font-medium">登録不要・匿名制</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-amber-100/40">
            お名前やメールは不要。端末内だけに安全に保存されます。
          </p>
        </div>

        <div className="text-[10px] text-amber-100/35 text-center">
          © 燈夜 — Anime Companion
        </div>
      </div>
    </aside>
  );
}
