import Link from "next/link";
import { NowPlayingCard } from "@/components/music/now-playing-card";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Panel } from "@/components/panel";
import { Cover } from "@/components/sleeve/cover";
import { Shelf } from "@/components/sleeve/shelf";
import { roastWeek } from "@/lib/roast";
import { getEras } from "@/lib/spotify/eras-data";
import { topArtistsDb } from "@/lib/spotify/queries";
import { getNowPlayingView } from "@/lib/spotify/view";
import { weekSummary } from "@/lib/spotify/week";
import { hasDb } from "@/db";

export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 86_400_000;

export default async function ShelfPage() {
  const now = new Date();
  const [view, { eras }, week, top] = await Promise.all([
    getNowPlayingView(),
    getEras(),
    weekSummary(),
    hasDb() ? topArtistsDb({ from: new Date(now.getTime() - WEEK_MS), to: now }, 3) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">Your shelf</h1>

      {view.status === "connected" ? (
        <div className="border-b border-rule pb-4">
          <NowPlayingCard initial={view.nowPlaying} fallback={view.lastPlayed} poll={!view.demo} />
        </div>
      ) : (
        <Link href="/api/auth/login" className="border-b border-rule pb-4 text-sm font-semibold underline">
          {view.status === "broken" ? "Spotify needs a reconnect" : "Connect Spotify to start the live sync"}
        </Link>
      )}

      <Shelf eras={eras} />

      <Panel title="This week" action={<SpotifyAttribution />}>
        <p className="max-w-prose text-lg leading-snug text-balance">{roastWeek(week)}</p>
        {top.length > 0 && (
          <ol className="mt-5 flex flex-col">
            {top.map((a, i) => (
              <li key={a.name} className="flex items-center gap-3 border-t border-rule py-2.5">
                <span className="display w-6 text-2xl text-muted-text">{i + 1}</span>
                <Cover url={a.imageUrl} size={40} alt={a.name} />
                <Link href={`/artist/${encodeURIComponent(a.name)}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                  {a.name}
                </Link>
                <span className="nums text-sm text-muted-text">{Math.round(a.minutes ?? 0)} min</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
