"use client";

import { useEffect, useState } from "react";
import { Cover } from "@/components/sleeve/cover";
import type { NowPlaying } from "@/lib/spotify/types";
import type { NowPlayingPayload } from "@/app/api/now-playing/route";
import { cn } from "@/lib/utils";

const POLL_MS = 15_000;

function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Live now-playing. Polls only while the tab is visible, and ticks the
 * progress bar locally between polls so it moves without hammering Spotify.
 * `fallback` (last played) shows when nothing is playing.
 */
export function NowPlayingCard({
  initial,
  fallback = null,
  poll,
  size = "hero",
}: {
  initial: NowPlaying | null;
  fallback?: NowPlaying | null;
  poll: boolean;
  size?: "hero" | "compact";
}) {
  const [np, setNp] = useState(initial);
  const [progress, setProgress] = useState(initial?.progressMs ?? 0);

  useEffect(() => {
    if (!poll) return;
    let stopped = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/now-playing", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const body = (await res.json()) as NowPlayingPayload;
        setNp(body.nowPlaying);
        setProgress(body.nowPlaying?.progressMs ?? 0);
      } catch {
        // Offline or a blip: keep showing the last known state.
      }
    };
    const id = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", load);
    };
  }, [poll]);

  useEffect(() => {
    if (!np?.isPlaying) return;
    const id = setInterval(() => setProgress((p) => Math.min(p + 1000, np.durationMs)), 1000);
    return () => clearInterval(id);
  }, [np]);

  const shown = np ?? fallback;
  const live = Boolean(np);
  const hero = size === "hero";

  if (!shown) {
    // Nothing to show: one quiet line, so the shelf starts on the first screen.
    return (
      <div className="flex items-center gap-3">
        <ArtTile item={null} hero={false} />
        <p className="text-sm text-muted-text">Nothing playing</p>
      </div>
    );
  }

  const label = live ? (np!.isPlaying ? "On the turntable" : "Paused") : "Last spin";
  const pct = live && shown.durationMs > 0 ? (progress / shown.durationMs) * 100 : 0;

  return (
    <div className={cn("flex items-center", hero ? "gap-5 p-5 sm:gap-7 sm:p-6" : "gap-4")}>
      <ArtTile item={shown} hero={hero} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-text">
          {live && np!.isPlaying && <Equalizer />}
          {label}
        </div>
        <a
          href={shown.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "mt-1 block font-semibold tracking-tight text-balance underline-offset-4 hover:underline",
            hero ? "line-clamp-2 text-2xl leading-tight sm:text-5xl sm:leading-[1.05]" : "truncate text-base"
          )}
        >
          {shown.title}
        </a>
        <div className={cn("truncate text-muted-text", hero ? "mt-1.5 text-base sm:text-lg" : "text-sm")}>
          {shown.subtitle}
        </div>
        {live && hero && (
          <div className="mt-5 flex items-center gap-3">
            <span className="nums w-10 text-xs text-faint">{mmss(progress)}</span>
            <div
              className="h-1 flex-1 overflow-hidden bg-rule"
              role="progressbar"
              aria-label="Track progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
            >
              <div
                className="h-full bg-text transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="nums w-10 text-right text-xs text-faint">{mmss(shown.durationMs)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ArtTile({ item, hero }: { item: NowPlaying | null; hero: boolean }) {
  return <Cover url={item?.imageUrl} size={hero ? 96 : 48} alt={item ? `Cover of ${item.title}` : "Nothing playing"} />;
}

/** Three bars that bounce while playing; static under reduced motion. */
function Equalizer() {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="eq-bar w-[3px] bg-text"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
