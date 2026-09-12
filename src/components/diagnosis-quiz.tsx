"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CharacterAvatar } from "@/components/character-avatar";
import { buttonVariants } from "@/components/ui/button";
import type { CharacterPublic } from "@/lib/character-types";
import { DIAGNOSIS_QUESTIONS, scoreDiagnosis, type DiagnosisId } from "@/lib/diagnosis";
import { cn } from "@/lib/utils";

export function DiagnosisQuiz({ roster }: { roster: CharacterPublic[] }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const step = answers.length;
  const done = step >= DIAGNOSIS_QUESTIONS.length;
  const result = useMemo(() => (done ? scoreDiagnosis(answers) : null), [answers, done]);
  const match = roster.find((character) => character.id === result?.id);

  function pick(choiceIndex: number) {
    setAnswers((prev) => [...prev, choiceIndex]);
  }

  if (done && match) {
    return (
      <div className="space-y-5">
        <p className="text-xs tracking-wide text-amber-100/50">今夜の相手</p>
        <div className="flex items-start gap-4">
          <CharacterAvatar character={match} size="lg" />
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl text-amber-50">{match.name}</p>
            <p className="text-xs text-amber-100/50">{match.reading}</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-50/80">{match.tagline}</p>
          </div>
        </div>
        <p className="rounded-xl bg-black/30 px-4 py-3 text-sm text-amber-50/80">「{match.greeting}」</p>
        <Link
          href={`/c/${match.id}`}
          className={cn(buttonVariants({ size: "lg" }), "w-full bg-rose-200 text-stone-900 hover:bg-rose-100")}
        >
          話しかける
        </Link>
        <button
          type="button"
          onClick={() => setAnswers([])}
          className="w-full text-center text-xs text-amber-100/50 underline-offset-2 hover:underline"
        >
          もう一度診断する
        </button>
      </div>
    );
  }

  const question = DIAGNOSIS_QUESTIONS[step];
  return (
    <div className="space-y-5">
      <p className="text-xs tabular-nums text-amber-100/45">
        {step + 1} / {DIAGNOSIS_QUESTIONS.length}
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-xl text-amber-50">{question.prompt}</h2>
      <ul className="grid gap-2">
        {question.choices.map((choice, index) => (
          <li key={choice.label}>
            <button
              type="button"
              onClick={() => pick(index)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-amber-50 hover:bg-white/10"
            >
              {choice.label}
            </button>
          </li>
        ))}
      </ul>
      {step > 0 ? (
        <button
          type="button"
          onClick={() => setAnswers((prev) => prev.slice(0, -1))}
          className="text-xs text-amber-100/50 underline-offset-2 hover:underline"
        >
          ひとつ戻る
        </button>
      ) : null}
      <p className="sr-only">{(Object.keys(result?.scores ?? {}) as DiagnosisId[]).join(" ")}</p>
    </div>
  );
}
