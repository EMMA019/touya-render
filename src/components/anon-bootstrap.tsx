"use client";

import { useEffect } from "react";
import { getOrCreateAnonymousId } from "@/lib/anonymous-client";

/** Creates a local install UUID. No signup, no PII. */
export function AnonBootstrap() {
  useEffect(() => {
    getOrCreateAnonymousId();
  }, []);
  return null;
}
