import Link from "next/link";
import { DiagnosisQuiz } from "@/components/diagnosis-quiz";
import { listPublicCharacters } from "@/lib/characters";

export const dynamic = process.env.TOUYA_CF_PAGES === "1" ? "force-static" : "force-dynamic";

export default function DiagnosisPage() {
  const roster = listPublicCharacters();
  return (
    <div className="night-canvas flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
        <p className="text-[11px] tracking-[0.28em] text-amber-100/50 uppercase">とうや</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-amber-50">今夜の相手診断</h1>
        <p className="text-sm leading-relaxed text-amber-50/70">
          10問です。登録は要りません。結果は端末の中だけです。
        </p>
        <DiagnosisQuiz roster={roster} />
        <Link href="/" className="text-xs text-amber-100/50 underline-offset-2 hover:underline">
          一覧に戻る
        </Link>
      </main>
    </div>
  );
}
