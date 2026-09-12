"use client";

import { useEffect, useState } from "react";
import { QuotaPill } from "@/components/quota-pill";
import { anonymousHeaders } from "@/lib/anonymous-client";
import { FREE_DAILY_TURNS } from "@/lib/config";

export function SiteQuota() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(FREE_DAILY_TURNS);
  const [debugUnlimited, setDebugUnlimited] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/session", { headers: anonymousHeaders() })
      .then((response) => response.json())
      .then((body: { quota?: { remaining?: number; limit?: number; debugUnlimited?: boolean }; debugUnlimited?: boolean }) => {
        if (cancelled || !body.quota) return;
        setRemaining(body.quota.remaining ?? FREE_DAILY_TURNS);
        setLimit(body.quota.limit ?? FREE_DAILY_TURNS);
        setDebugUnlimited(body.quota.debugUnlimited === true || body.debugUnlimited === true);
      })
      .catch(() => {
        if (!cancelled) setRemaining(FREE_DAILY_TURNS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <QuotaPill remaining={remaining} limit={limit} debugUnlimited={debugUnlimited} />;
}
