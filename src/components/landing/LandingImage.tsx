"use client";

import Image from "next/image";
import { useState } from "react";
import { clsx } from "clsx";
import {
  getLandingImageSources,
  type LandingImageKey,
} from "@/lib/landing-pages";

interface LandingImageProps {
  imageKey: LandingImageKey;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes: string;
}

export default function LandingImage({
  imageKey,
  alt,
  priority = false,
  className,
  sizes,
}: LandingImageProps) {
  const { src, fallbackSrc } = getLandingImageSources(imageKey);
  const [useFallback, setUseFallback] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const currentSrc = useFallback && fallbackSrc ? fallbackSrc : src;

  if (showPlaceholder) {
    return (
      <div
        className={clsx(
          "flex min-h-full items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        BioMobility
      </div>
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={clsx("object-cover", className)}
      onError={() => {
        if (fallbackSrc && !useFallback) {
          setUseFallback(true);
          return;
        }

        setShowPlaceholder(true);
      }}
    />
  );
}
