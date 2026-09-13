"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Premium / 広告なし is removed from personal-use entry UI. */
export default function PremiumPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
