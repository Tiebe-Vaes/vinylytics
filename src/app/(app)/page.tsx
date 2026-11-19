import Link from "next/link";
import { Suspense } from "react";
import { NowPlayingCard } from "@/components/music/now-playing-card";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Panel } from "@/components/panel";
import { Cover } from "@/components/sleeve/cover";
import { Shelf } from "@/components/sleeve/shelf";
import { eraSpan } from "@/components/sleeve/sleeve";
import { EraTimeline } from "@/components/sleeve/era-timeline";
import { roastWeek } from "@/lib/roast";
import { getEras } from "@/lib/spotify/eras-data";
import { topArtistsDb } from "@/lib/spotify/queries";
import { getNowPlayingView } from "@/lib/spotify/view";
import { weekSummary } from "@/lib/spotify/week";
import { hasDb } from "@/db";
import { ArrowUpRight } from "lucide-react";
import { localDateKey } from "@/lib/time";
import { ShareButton } from "@/components/sleeve/share-button";
import { Skeleton } from "@/components/ui/skeleton";
import { artistHref } from "@/lib/href";

export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 86_400_000;

async function Turntable() {
  const view = await getNowPlayingView();
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule pb-4">
      <NowPlayingCard
        initial={view.status === "connected" ? view.nowPlaying : null}
        fallback={view.status === "connected" ? view.lastPlayed : null}
        poll={view.status === "connected" && !view.demo}
      />
      {view.status !== "connected" && !process.env.SPOTIFY_CLIENT_ID ? (
        // Recap-only copies have no Spotify app; the export is their only source.
        <Link href="/settings/import" className="shrink-0 text-sm font-semibold underline">Import history</Link>
      ) : view.status !== "connected" && (
        <a href="/api/auth/login" className="shrink-0 text-sm font-semibold underline">
          {view.status === "broken" ? "Reconnect" : "Connect Spotify"}
        </a>
      )}
    </div>
  );
}

export default async function ShelfPage() {
  const now = new Date();
  const year = localDateKey(now).slice(0, 4);
  const [{ eras }, week, top] = await Promise.all([
    getEras(),
    weekSummary(),
    hasDb() ? topArtistsDb({ from: new Date(now.getTime() - WEEK_MS), to: now }, 3) : Promise.resolve([]),
  ]);

  const latestEra = eras.at(-1);
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<Skeleton className="h-[65px] w-full" />}>
        <Turntable />
      </Suspense>

      <section aria-labelledby="shelf-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <h1 id="shelf-title" className="display text-6xl sm:text-8xl">Your shelf</h1>
          {latestEra && <ShareButton href={`/api/card/era/${latestEra.id}`} filename={`vinylytics-${latestEra.id}.png`}
            title={latestEra.name} defaultInk={latestEra.ink} label="Share latest era"
            preview={{ cover: "Era artwork", period: eraSpan(latestEra), lead: latestEra.lead, stat: `${Math.round(latestEra.minutes).toLocaleString("en-GB")} minutes`, rows: "Top songs" }} />}
        </div>
        <EraTimeline eras={eras} today={localDateKey(now)} />
        <Shelf eras={eras} />
      </section>

      <Link href={`/recap?year=${year}`} className="group flex flex-wrap items-end justify-between gap-4 border-y border-current bg-text px-5 py-6 text-ground sm:px-7">
        <span className="display text-4xl sm:text-6xl">{year} in music</span>
        <span className="flex items-center gap-2 font-semibold">Open your recap <ArrowUpRight className="hover-reveal size-5 group-hover:-translate-y-0.5" aria-hidden /></span>
      </Link>

      <Panel title="This week" action={<SpotifyAttribution />}>
        <p className="max-w-prose text-lg leading-snug text-balance">{roastWeek(week)}</p>
        {top.length > 0 && (
          <ol className="mt-5 flex flex-col">
            {top.map((a, i) => (
              <li key={a.name} className="flex items-center gap-3 border-t border-rule py-2.5">
                <span className="display w-6 text-2xl text-muted-text">{i + 1}</span>
                <Cover url={a.imageUrl} size={40} alt={a.name} />
                <Link href={artistHref(a.name)} className="min-w-0 flex-1 truncate font-semibold hover:underline">
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
