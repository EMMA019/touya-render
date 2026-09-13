"use client";

import type { AdPlacement } from "@/lib/ads";

type AdSlotProps = {
  placement: AdPlacement;
  className?: string;
};

/** Personal-use: no AdMob path in UI. */
export function AdSlot(_props: AdSlotProps) {
  return null;
}
