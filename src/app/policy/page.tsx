import Link from "next/link";
import { POLICY_HEADING } from "@/lib/product-copy";

const RULES = [
  {
    title: "知っていても、自分から長々と語らない",
    body: "設定やこれまでの短い記憶は大切に持っています。ただし、聞かれたときや自然な相槌として必要なときだけ一言返すにとどめ、プロフィールを並べ立てるような不自然な会話はしません。",
  },
  {
    title: "覚える内容を大切に選ぶ",
    body: "「覚えておいて」と頼まれたことや、お名前、好みの話題など、ずっと続く大切な事柄だけを残します。今日だけの疲れや他愛ない雑談を無暗にデータベースに残すことはありません。",
  },
  {
    title: "安全のために",
    body: "性的なロールプレイや過度な要求には応じません。そうした発言が重なった場合、そのお相手との会話は一定時間お休みとなります。",
  },
  {
    title: "1回のお返事に真心を込める",
    body: "送信されたメッセージごとに、その場で素直に1回だけ応答を生成します。過剰な監視モデルによる書き換えや検閲ループを挟まず、自然な対話を大切にしています。",
  },
  {
    title: "会員登録や個人情報は不要",
    body: "お名前やメールアドレスを収集することはありません。お使いの端末内に保持される匿名の識別情報と、端末に保存された対話履歴だけで安心してご利用いただけます。",
  },
];

export default function PolicyPage() {
  return (
    <div className="night-canvas flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
        <p className="text-[11px] tracking-[0.28em] text-amber-100/50 uppercase">とうや</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-amber-50">{POLICY_HEADING}</h1>
        <ul className="space-y-3">
          {RULES.map((rule) => (
            <li key={rule.title} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-sm font-medium text-amber-50">{rule.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/65">{rule.body}</p>
            </li>
          ))}
        </ul>
        <Link href="/" className="text-xs text-amber-100/50 underline-offset-2 hover:underline">
          一覧に戻る
        </Link>
      </main>
    </div>
  );
}
