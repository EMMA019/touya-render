import Link from "next/link";
import { PolicyRules } from "@/components/policy-rules";
import { POLICY_HEADING } from "@/lib/product-copy";

export default function PolicyPage() {
  return (
    <div className="night-canvas flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
        <p className="text-[11px] tracking-[0.28em] text-amber-100/50 uppercase">とうや</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-amber-50">{POLICY_HEADING}</h1>
        <PolicyRules />
        <Link href="/" className="text-xs text-amber-100/50 underline-offset-2 hover:underline">
          一覧に戻る
        </Link>
      </main>
    </div>
  );
}
