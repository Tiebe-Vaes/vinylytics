import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Empty, PageHeader, Panel, SectionLabel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Totals } from "@/components/music/totals";
import { MinutesChart } from "@/components/music/minutes-chart";
import { HourHeatmap } from "@/components/music/hour-heatmap";
import { ArtistBump } from "@/components/music/artist-bump";
import { Genres } from "@/components/music/genres";
import { RangeSelect } from "@/components/music/range-select";
import { YearCalendar } from "@/components/music/year-calendar";
import { Obsessions } from "@/components/music/obsessions";
import { Discovery } from "@/components/music/discovery";
import { SkipRate } from "@/components/music/skip-rate";
import { KindSplit } from "@/components/music/kind-split";
import { Cover } from "@/components/sleeve/cover";
import { roastEmpty } from "@/lib/roast";
import { topItems, type ChartKind, type ChartSort } from "@/lib/spotify/charts";
import { CHART_RANGES, chartRange, getChartData, getMusicData, type ChartRange } from "@/lib/spotify/data";
import { addDaysKey, localDateKey, localToUtc } from "@/lib/time";

export const dynamic = "force-dynamic";

type Params = { kind?: string; range?: string; sort?: string; from?: string; to?: string; year?: string };
type RangeOpt = ChartRange | "custom";

const KINDS: { value: ChartKind; label: string }[] = [
  { value: "artist", label: "Artists" },
  { value: "track", label: "Tracks" },
  { value: "album", label: "Albums" },
];
const SORTS: { value: ChartSort; label: string }[] = [
  { value: "time", label: "By time" },
  { value: "plays", label: "By plays" },
];
const RANGES: { value: RangeOpt; label: string }[] = [...CHART_RANGES.map(({ value, label }) => ({ value, label })), { value: "custom", label: "Custom" }];

const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const dayToUtc = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return localToUtc(y, m, d);
};

export default async function ChartsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const kind: ChartKind = KINDS.some((k) => k.value === p.kind) ? (p.kind as ChartKind) : "artist";
  const sort: ChartSort = p.sort === "plays" ? "plays" : "time";
  const range: RangeOpt = RANGES.some((r) => r.value === p.range) ? (p.range as RangeOpt) : "4w";
  const today = localDateKey();
  const from = isDay(p.from) ? p.from! : addDaysKey(today, -30);
  const to = isDay(p.to) ? p.to! : today;
  const thisYear = Number(today.slice(0, 4));
  const y = Number(p.year);
  const year = Number.isInteger(y) && y >= 2008 && y <= thisYear ? y : thisYear;

  const window =
    range === "custom" ? { from: dayToUtc(from), to: dayToUtc(addDaysKey(to, 1)) } : chartRange(range);
  const items = await topItems({ kind, from: window?.from ?? null, to: window?.to ?? null, sort, limit: 20 });

  const qs = (patch: Partial<Params>) => {
    const next = { kind, sort, range, ...(range === "custom" ? { from, to } : {}), ...patch };
    return `/charts?${new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][])}`;
  };
  // Patterns below follow the preset ranges; a custom range shows them for all time.
  const patternRange: ChartRange = range === "custom" ? "all" : range;

  return (
    <>
      <PageHeader title="Charts" actions={<SpotifyAttribution />} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <RangeSelect label="Chart type" options={KINDS} value={kind} href={(v) => qs({ kind: v })} />
          <RangeSelect label="Sort" options={SORTS} value={sort} href={(v) => qs({ sort: v })} />
        </div>
        <RangeSelect label="Range" options={RANGES} value={range} href={(v) => qs({ range: v, from: undefined, to: undefined })} />
        {range === "custom" && (
          <form action="/charts" className="flex flex-wrap items-end gap-2 text-sm">
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="range" value="custom" />
            <label className="flex flex-col gap-1 text-xs text-muted-text">
              From
              <input type="date" name="from" defaultValue={from} max={today} className="h-9 rounded-[2px] border border-input bg-ground px-2 text-sm text-text" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-text">
              To
              <input type="date" name="to" defaultValue={to} max={today} className="h-9 rounded-[2px] border border-input bg-ground px-2 text-sm text-text" />
            </label>
            <Button size="sm" type="submit">Apply</Button>
          </form>
        )}
      </div>

      <ol className="mt-6" aria-label={`Top ${kind}s`}>
        {items.length === 0 && <Empty>{roastEmpty("charts")}</Empty>}
        {items.map((item, i) => (
          <li key={item.key} className="flex items-center gap-3 border-t border-rule py-2.5">
            <span className="display w-8 shrink-0 text-2xl text-muted-text">{i + 1}</span>
            <Cover url={item.cover} size={44} alt={item.name} />
            <div className="min-w-0 flex-1">
              <Link href={item.href} className="block truncate font-semibold hover:underline">
                {item.name}
              </Link>
              {item.subtitle && <div className="truncate text-sm text-muted-text">{item.subtitle}</div>}
            </div>
            <div className="nums shrink-0 text-right text-sm">
              <div className="font-semibold">{sort === "plays" ? `${item.streams}×` : `${Math.round(item.minutes)} min`}</div>
              <div className="text-xs text-muted-text">{sort === "plays" ? `${Math.round(item.minutes)} min` : `${item.streams}×`}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-col gap-10">
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <Overview />
        </Suspense>
        <Suspense key={`${patternRange}-${year}`} fallback={<Skeleton className="h-64 w-full" />}>
          <Patterns range={patternRange} year={year} />
        </Suspense>
      </div>
    </>
  );
}

async function Overview() {
  const data = await getMusicData(null);
  const year = Number(localDateKey().slice(0, 4));
  return (
    <>
      <Totals data={data} year={year} />
      <MinutesChart byMonth={data.byMonth} />
    </>
  );
}

async function Patterns({ range, year }: { range: ChartRange; year: number }) {
  const data = await getChartData(range, year);
  const thisYear = Number(localDateKey().slice(0, 4));
  const href = (y: number) => `/charts?range=${range}${y !== thisYear ? `&year=${y}` : ""}`;
  const days = data.calendar.days;

  return (
    <section className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Panel title="Listening clock">
          {data.hourWeekday.length === 0 ? <Empty>No plays in this range.</Empty> : <HourHeatmap data={data.hourWeekday} />}
        </Panel>
        <Panel title="Genres">
          {data.genres.length === 0 ? <Empty>Genres appear once artists are looked up on Last.fm.</Empty> : <Genres genres={data.genres} />}
        </Panel>
      </div>

      <Panel title="Top artists over time">
        {data.bump.months.length < 2 ? <Empty>Needs at least two months of plays in this range.</Empty> : <ArtistBump bump={data.bump} />}
      </Panel>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Panel title="Obsessions">
          {data.obsessions.length === 0 ? <Empty>No binges here: nothing played 15+ times in two weeks.</Empty> : <Obsessions items={data.obsessions} />}
        </Panel>
        <Panel title="New artists per month">
          {data.discovery.length === 0 ? <Empty>No new artists in this range.</Empty> : <Discovery data={data.discovery} />}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Panel title="Most skipped" subtitle="From your export, all time">
          {data.skips.tracks.length === 0 && data.skips.artists.length === 0 ? (
            <Empty>Skip data comes from the export import.</Empty>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <SkipRate title="Tracks" rows={data.skips.tracks} />
              <SkipRate title="Artists" rows={data.skips.artists} />
            </div>
          )}
        </Panel>
        <Panel title="Music, podcasts, audiobooks">
          {data.kinds.length === 0 ? <Empty>No plays in this range.</Empty> : <KindSplit kinds={data.kinds} />}
        </Panel>
      </div>

      <Card>
        <SectionLabel
          action={
            <div className="flex items-center gap-1">
              <YearLink href={href(year - 1)} label="Previous year" disabled={year <= 2008}>
                <ChevronLeft className="size-4" />
              </YearLink>
              <span className="nums w-10 text-center text-sm">{year}</span>
              <YearLink href={href(year + 1)} label="Next year" disabled={year >= thisYear}>
                <ChevronRight className="size-4" />
              </YearLink>
            </div>
          }
        >
          Every day
        </SectionLabel>
        <div className="py-4">{days.length === 0 ? <Empty>No plays in {year}.</Empty> : <YearCalendar days={days} year={year} />}</div>
      </Card>
    </section>
  );
}

function YearLink({ href, label, disabled, children }: { href: string; label: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span aria-hidden className="flex size-8 items-center justify-center text-faint/50">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className="flex size-8 items-center justify-center text-muted-text hover:text-text">
      {children}
    </Link>
  );
}
