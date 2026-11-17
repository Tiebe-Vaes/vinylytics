import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Empty, PageHeader, SectionLabel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NowPlayingCard } from "@/components/music/now-playing-card";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Totals } from "@/components/music/totals";
import { MinutesChart } from "@/components/music/minutes-chart";
import { TopLists } from "@/components/music/top-lists";
import { HourHeatmap } from "@/components/music/hour-heatmap";
import { ArtistBump } from "@/components/music/artist-bump";
import { Genres } from "@/components/music/genres";
import { RangeSelect } from "@/components/music/range-select";
import { YearCalendar } from "@/components/music/year-calendar";
import { Obsessions } from "@/components/music/obsessions";
import { Discovery } from "@/components/music/discovery";
import { SkipRate } from "@/components/music/skip-rate";
import { KindSplit } from "@/components/music/kind-split";
import { getNowPlayingView } from "@/lib/spotify/view";
import { CHART_RANGES, getChartData, getMusicData, type ChartRange } from "@/lib/spotify/data";
import { localDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function MusicPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; year?: string }>;
}) {
  const params = await searchParams;
  const range: ChartRange = CHART_RANGES.some((r) => r.value === params.range) ? (params.range as ChartRange) : "1y";
  const thisYear = Number(localDateKey().slice(0, 4));
  const y = Number(params.year);
  const year = Number.isInteger(y) && y >= 2008 && y <= thisYear ? y : thisYear;
  const view = await getNowPlayingView();

  return (
    <>
      <PageHeader title="Music" description="What you listen to, and how much." actions={<SpotifyAttribution />} />

      <div className="flex flex-col gap-6">
        {view.status === "connected" ? (
          <Card>
            <NowPlayingCard initial={view.nowPlaying} fallback={view.lastPlayed} poll={!view.demo} />
          </Card>
        ) : (
          <ConnectPanel broken={view.status === "broken"} />
        )}

        <Suspense fallback={<StatsSkeleton />}>
          <Stats />
        </Suspense>

        <Suspense key={`${range}-${year}`} fallback={<ChartsSkeleton />}>
          <Charts range={range} year={year} />
        </Suspense>
      </div>
    </>
  );
}

async function Stats() {
  const data = await getMusicData(null);
  const year = Number(localDateKey().slice(0, 4));
  return (
    <>
      <Totals data={data} year={year} />
      <TopLists top={data.top} />
      <MinutesChart byMonth={data.byMonth} />
    </>
  );
}

async function Charts({ range, year }: { range: ChartRange; year: number }) {
  const data = await getChartData(range, year);
  const thisYear = Number(localDateKey().slice(0, 4));
  const href = (r: ChartRange, y = year) => `/?range=${r}${y !== thisYear ? `&year=${y}` : ""}`;
  const days = data.calendar.days;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Patterns</h2>
        <RangeSelect label="Chart range" options={CHART_RANGES} value={range} href={(r) => href(r)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionLabel>When you listen</SectionLabel>
          <div className="p-5">
            {data.hourWeekday.length === 0 ? <Empty>No plays in this range.</Empty> : <HourHeatmap data={data.hourWeekday} />}
          </div>
        </Card>
        <Card>
          <SectionLabel>Genres</SectionLabel>
          <div className="p-5">
            {data.genres.length === 0 ? (
              <Empty>Genres appear once artists are looked up on Last.fm.</Empty>
            ) : (
              <Genres genres={data.genres} />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <SectionLabel>Top artists over time</SectionLabel>
        <div className="p-5">
          {data.bump.months.length < 2 ? (
            <Empty>Needs at least two months of plays in this range.</Empty>
          ) : (
            <ArtistBump bump={data.bump} />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <SectionLabel>Obsessions</SectionLabel>
          {data.obsessions.length === 0 ? (
            <Empty>No binges in this range: nothing played 15+ times in two weeks.</Empty>
          ) : (
            <Obsessions items={data.obsessions} />
          )}
        </Card>
        <Card>
          <SectionLabel>New artists per month</SectionLabel>
          <div className="p-5">
            {data.discovery.length === 0 ? <Empty>No new artists in this range.</Empty> : <Discovery data={data.discovery} />}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <SectionLabel action={<span className="text-xs text-faint">Export data, all time</span>}>Most skipped</SectionLabel>
          {data.skips.tracks.length === 0 && data.skips.artists.length === 0 ? (
            <Empty>Skip data comes from the export import.</Empty>
          ) : (
            <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-border">
              <SkipRate title="Tracks" rows={data.skips.tracks} />
              <SkipRate title="Artists" rows={data.skips.artists} />
            </div>
          )}
        </Card>
        <Card>
          <SectionLabel>Music, podcasts, audiobooks</SectionLabel>
          <div className="p-5">
            {data.kinds.length === 0 ? <Empty>No plays in this range.</Empty> : <KindSplit kinds={data.kinds} />}
          </div>
        </Card>
      </div>

      <Card>
        <SectionLabel
          action={
            <div className="flex items-center gap-1">
              <YearLink href={href(range, year - 1)} label="Previous year" disabled={year <= 2008}>
                <ChevronLeft className="size-4" />
              </YearLink>
              <span className="nums w-10 text-center text-sm">{year}</span>
              <YearLink href={href(range, year + 1)} label="Next year" disabled={year >= thisYear}>
                <ChevronRight className="size-4" />
              </YearLink>
            </div>
          }
        >
          Every day
        </SectionLabel>
        <div className="p-5">
          {days.length === 0 ? (
            <Empty>No plays in {year}.</Empty>
          ) : (
            <YearCalendar days={days} year={year} />
          )}
        </div>
      </Card>
    </section>
  );
}

function YearLink({ href, label, disabled, children }: { href: string; label: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span aria-hidden className="flex size-7 items-center justify-center text-faint/50">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
      {children}
    </Link>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="p-5"><Skeleton className="h-48 w-full" /></Card>
      <Card className="p-5"><Skeleton className="h-48 w-full" /></Card>
    </div>
  );
}

/** Same footprint as the loaded strip and chart, so nothing jumps. */
function StatsSkeleton() {
  return (
    <>
      <Card className="grid grid-cols-2 gap-px lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="col-span-2 p-6 lg:col-span-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-12 w-40" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="p-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-6 w-20" />
          </div>
        ))}
      </Card>
      <Card className="p-5">
        <Skeleton className="h-56 w-full" />
      </Card>
    </>
  );
}

function ConnectPanel({ broken }: { broken: boolean }) {
  return (
    <Card className="flex flex-col items-start gap-4 p-6 sm:p-8">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {broken ? "Spotify needs a reconnect" : "Connect Spotify"}
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          {broken
            ? "Spotify stopped accepting the saved login. Connect again to resume syncing; nothing already stored is lost."
            : "Link your Spotify account to see what's playing, your top artists and tracks, and your full listening history."}
        </p>
      </div>
      {/* A plain <a>: Link would prefetch the route and start the OAuth dance early. */}
      <Button render={<a href="/api/auth/login" />} nativeButton={false}>
        {broken ? "Reconnect Spotify" : "Connect Spotify"}
      </Button>
    </Card>
  );
}
