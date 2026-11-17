import { unstable_cache } from "next/cache";
import { localDateKey } from "@/lib/time";
import { computeStreaks, findObsessions, genreMinutes, rankByMonth, type Obsession } from "./stats";
import * as q from "./queries";
import { sampleChartData, sampleMusicData, musicSampleMode } from "./sample";
import { getTopItems } from "./top";
import type { Range, TopItem } from "./types";

export type TopRange = "4w" | "6m" | "all";

/**
 * Everything /music renders, in one cached call. Only plain JSON goes in here
 * (no Date), because unstable_cache serializes the result.
 */
export type MusicData = {
  totals: { minutes: number; streams: number; tracks: number; artists: number };
  byMonth: { month: string; minutes: number }[];
  byYear: { year: number; minutes: number }[];
  streaks: { current: number; longest: number };
  mostActiveWeekday: { weekday: number; avgMinutes: number } | null;
  biggestDay: { date: string; minutes: number } | null;
  todayMinutes: number;
  top: { artists: Record<TopRange, TopItem[]>; tracks: Record<TopRange, TopItem[]> };
};

/**
 * The data cache outlives restarts and deploys, so a MusicData shape change
 * must not be served an old entry. Bump this whenever MusicData changes.
 */
const SHAPE = "v3";

function rangeKey(range: Range): string {
  return range ? `${range.from.toISOString()}_${range.to.toISOString()}` : "all";
}

const DAY = 86_400_000;

/** Spotify's own lists for 4w/6m; our plays when Spotify isn't reachable. */
async function topFor(type: "artists" | "tracks", term: "short_term" | "medium_term", days: number) {
  const api = await getTopItems(type, term).catch(() => []);
  if (api.length > 0) return api;
  const now = new Date();
  const range = { from: new Date(now.getTime() - days * DAY), to: now };
  return type === "artists" ? q.topArtistsDb(range, 20) : q.topTracksDb(range, 20);
}

async function loadTop(): Promise<MusicData["top"]> {
  const [a4, a6, aAll, t4, t6, tAll] = await Promise.all([
    topFor("artists", "short_term", 28),
    topFor("artists", "medium_term", 182),
    q.topArtistsDb(null, 20),
    topFor("tracks", "short_term", 28),
    topFor("tracks", "medium_term", 182),
    q.topTracksDb(null, 20),
  ]);
  return { artists: { "4w": a4, "6m": a6, all: aAll }, tracks: { "4w": t4, "6m": t6, all: tAll } };
}

async function load(range: Range): Promise<MusicData> {
  const today = localDateKey();
  const [totals, byMonth, byDay, dayKeys, weekdays, top] = await Promise.all([
    q.totals(range),
    q.minutesByMonth(range),
    q.minutesByDay(range),
    q.streamDayKeys(),
    q.weekdayAverages(range),
    loadTop(),
  ]);

  const years = new Map<number, number>();
  for (const m of byMonth) {
    const y = Number(m.month.slice(0, 4));
    years.set(y, (years.get(y) ?? 0) + m.minutes);
  }

  return {
    totals,
    byMonth,
    byYear: [...years].map(([year, minutes]) => ({ year, minutes })),
    streaks: computeStreaks(dayKeys, today),
    mostActiveWeekday: weekdays.reduce<MusicData["mostActiveWeekday"]>(
      (best, w) => (!best || w.avgMinutes > best.avgMinutes ? w : best),
      null
    ),
    biggestDay: byDay.reduce<MusicData["biggestDay"]>(
      (best, d) => (!best || d.minutes > best.minutes ? d : best),
      null
    ),
    todayMinutes: byDay.find((d) => d.date === today)?.minutes ?? 0,
    top,
  };
}

export async function getMusicData(range: Range): Promise<MusicData> {
  if (musicSampleMode()) return sampleMusicData;
  return unstable_cache(() => load(range), ["music", SHAPE, rangeKey(range)], { tags: ["spotify"] })();
}

/* ---------------------------------------------------------------------------
 * Charts, scoped by the page's range selector.
 * ------------------------------------------------------------------------- */

export type ChartRange = "4w" | "6m" | "1y" | "all";
export const CHART_RANGES: { value: ChartRange; label: string; days: number | null }[] = [
  { value: "4w", label: "4 weeks", days: 28 },
  { value: "6m", label: "6 months", days: 182 },
  { value: "1y", label: "1 year", days: 365 },
  { value: "all", label: "All time", days: null },
];

export type ChartData = {
  hourWeekday: { weekday: number; hour: number; minutes: number }[];
  calendar: { year: number; days: { date: string; value: number }[] };
  bump: ReturnType<typeof rankByMonth>;
  genres: ReturnType<typeof genreMinutes>;
  obsessions: Obsession[];
  discovery: { month: string; count: number; names: string[] }[];
  skips: { tracks: q.SkipRow[]; artists: q.SkipRow[] };
  kinds: { kind: "track" | "episode" | "audiobook"; minutes: number }[];
};

export function chartRange(value: ChartRange, now = new Date()): Range {
  const days = CHART_RANGES.find((r) => r.value === value)?.days ?? null;
  return days == null ? null : { from: new Date(now.getTime() - days * DAY), to: now };
}

async function loadCharts(value: ChartRange, year: number): Promise<ChartData> {
  const range = chartRange(value);
  // The calendar is a whole local year, independent of the range selector.
  const yearRange = {
    from: new Date(`${year - 1}-12-31T00:00:00Z`),
    to: new Date(`${year + 1}-01-02T00:00:00Z`),
  };
  const [hw, days, artistMonths, artists, tags, trackDays, discovery, skips, kinds] = await Promise.all([
    q.hourWeekday(range),
    q.minutesByDay(yearRange),
    q.artistMonthMinutes(range),
    q.artistMinutes(range),
    q.artistTags(),
    q.trackDayCounts(range),
    q.newArtistsByMonth(range),
    q.skipRates(),
    q.kindSplit(range),
  ]);
  const candidates = findObsessions(trackDays, new Map());
  const allTime = await q.allTimeTrackStreams(candidates.map((c) => c.uri));
  return {
    hourWeekday: hw,
    calendar: {
      year,
      days: days.filter((d) => d.date.startsWith(String(year))).map((d) => ({ date: d.date, value: d.minutes })),
    },
    bump: rankByMonth(artistMonths, 8),
    genres: genreMinutes(artists, tags),
    obsessions: findObsessions(trackDays.filter((t) => allTime.has(t.uri)), allTime),
    discovery,
    skips,
    kinds,
  };
}

export async function getChartData(value: ChartRange, year: number): Promise<ChartData> {
  if (musicSampleMode()) return sampleChartData(year);
  // Hour-granular key: "now" moves, but a range rolling by minutes isn't worth a cache miss.
  const hour = new Date().toISOString().slice(0, 13);
  return unstable_cache(() => loadCharts(value, year), ["music-charts", SHAPE, value, String(year), value === "all" ? "" : hour], {
    tags: ["spotify"],
  })();
}
