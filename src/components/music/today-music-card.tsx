import Link from "next/link";
import { Card, SectionLabel } from "@/components/panel";
import { NowPlayingCard } from "./now-playing-card";
import type { NowPlayingView } from "@/lib/spotify/view";

/** Compact now playing on Today. Hidden until Spotify is connected. */
export function TodayMusicCard({ view, todayMinutes }: { view: NowPlayingView; todayMinutes: number }) {
  if (view.status !== "connected") return null;
  return (
    <Card>
      <SectionLabel
        action={
          <Link href="/music" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Music
          </Link>
        }
      >
        Listening
      </SectionLabel>
      <div className="p-5">
        <NowPlayingCard initial={view.nowPlaying} fallback={view.lastPlayed} poll={!view.demo} size="compact" />
      </div>
      <div className="flex items-baseline justify-between border-t border-border px-5 py-2.5 text-xs">
        <span className="text-muted-foreground">Today</span>
        <span className="nums font-medium">{Math.round(todayMinutes)} min</span>
      </div>
    </Card>
  );
}
