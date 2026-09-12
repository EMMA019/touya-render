import { DIFFERENCE_HEADING, DIFFERENCES } from "@/lib/product-copy";

export function DifferenceNotes() {
  return (
    <section className="max-w-3xl space-y-4">
      <h2 className="text-sm tracking-wide text-amber-100/60">{DIFFERENCE_HEADING}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {DIFFERENCES.map((item) => (
          <li
            key={item.title}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
          >
            <p className="text-sm font-medium text-amber-50">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/60">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
