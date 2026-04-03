"use client";

import { useEffect, useState } from "react";

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Unavailable";
  }

  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${minutes}m ${remainder}s`;
}

export function CallDuration({
  duration,
  recordingUrl,
}: {
  duration: string;
  recordingUrl?: string;
}) {
  const [resolvedDuration, setResolvedDuration] = useState<string | null>(null);

  useEffect(() => {
    if (duration !== "Not reliable" || !recordingUrl) {
      return;
    }

    let cancelled = false;
    const audio = new Audio();
    audio.preload = "metadata";

    const handleLoadedMetadata = () => {
      if (!cancelled) {
        setResolvedDuration(formatDuration(audio.duration));
      }
    };

    const handleError = () => {
      if (!cancelled) {
        setResolvedDuration("Unavailable");
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("error", handleError);
    audio.src = recordingUrl;

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
    };
  }, [duration, recordingUrl]);

  return <>{resolvedDuration ?? duration}</>;
}
