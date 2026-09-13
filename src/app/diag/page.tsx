"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 相手診断 is removed from personal-use entry UI. */
export default function DiagnosisPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
