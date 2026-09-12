"use client";

import { useState } from "react";
import { anonymousHeaders } from "@/lib/anonymous-client";
import { REWARD_EXTRA_TURNS } from "@/lib/config";
import type { Quota } from "@/lib/quota-types";

export function RewardedAdButton({
  rewardsLeft,
  onGranted,
}: {
  rewardsLeft: number;
  onGranted: (quota: Quota) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

    if (rewardsLeft <= 0) {
    return (
      <p className="text-xs text-amber-100/50">
        本日のリワード広告枠は上限に達しました。日本時間の午前0時に再度ご利用いただけます。
      </p>
    );
  }

  async function watchStub() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/reward", {
        method: "POST",
        headers: anonymousHeaders(),
      });
      const body = (await response.json()) as {
        quota?: Quota;
        message?: string;
      };
      if (!response.ok || !body.quota) {
        throw new Error(body.message ?? "リワードの付与に失敗しました。");
      }
      onGranted(body.quota);
      setMessage(`会話枠を +${REWARD_EXTRA_TURNS}通 追加しました。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void watchStub()}
        className="w-full rounded-lg border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-sm text-amber-50 hover:bg-amber-200/20 disabled:opacity-50"
      >
        {busy ? "読み込み中…" : `動画広告を見て +${REWARD_EXTRA_TURNS}通 追加`}
      </button>
      <p className="text-[11px] text-amber-100/45">
        ※ 広告動画をご視聴いただくことで会話数を回復できます。アカウント登録は不要です。
      </p>
      {message ? <p className="text-xs text-amber-100/70">{message}</p> : null}
    </div>
  );
}
