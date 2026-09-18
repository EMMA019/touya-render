"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Oz-style looping situation video with still PNG fallback. */
export function SituationBackdrop({
  image,
  video,
  className,
}: {
  image?: string | null;
  video?: string | null;
  className?: string;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const src = video?.trim() || "";

  if (src && !videoFailed) {
    return (
      <video
        key={src}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        className={cn("h-full w-full object-cover object-center", className)}
        onError={() => setVideoFailed(true)}
        aria-hidden
      />
    );
  }

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" className={cn("h-full w-full object-contain object-center", className)} />
    );
  }

  return null;
}
