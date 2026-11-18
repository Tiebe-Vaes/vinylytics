import { unstable_cache } from "next/cache";
import { hasDb } from "@/db";
import { timezone } from "@/lib/tz";
import { artistMinutes, artistMonthMinutes, artistTags, kindSplit, minutesByMonth } from "./queries";
import { genreMinutes, rankByMonth } from "./stats";
import type { Range } from "./types";

export function artistTrend(rows: Awaited<ReturnType<typeof artistMonthMinutes>>) {
  const months = [...new Set(rows.map(row => row.month))].sort();
  const ordinal = (key: string) => Number(key.slice(0,4)) * 12 + Number(key.slice(5));
  const span = months.length ? ordinal(months[months.length - 1]) - ordinal(months[0]) + 1 : 0;
  const unit = span > 72 ? "year" : span > 24 ? "quarter" : "month";
  const buckets = new Map<string,Map<string,number>>();
  for (const {month, artist, minutes} of rows) {
    const key = unit === "year" ? month.slice(0,4) : unit === "quarter" ? `${month.slice(0,4)} Q${Math.ceil(Number(month.slice(5))/3)}` : month;
    const artists = buckets.get(key) ?? new Map<string,number>();
    artists.set(artist, (artists.get(artist) ?? 0) + minutes);
    buckets.set(key, artists);
  }
  return { unit, ...rankByMonth([...buckets].flatMap(([month, artists]) => [...artists].map(([artist, minutes]) => ({month, artist, minutes}))), 5) };
}

export async function chartPatterns(range: Range) {
  const run = async () => {
    if (!hasDb()) return {bump: artistTrend([]), genres: [], kinds: [], months: []};
    const [artistMonths, artists, tags, kinds, months] = await Promise.all([
      artistMonthMinutes(range), artistMinutes(range), artistTags(), kindSplit(range), minutesByMonth(range)
    ]);
    return {bump: artistTrend(artistMonths), genres: genreMinutes(artists,tags), kinds, months};
  };
  return unstable_cache(run, ["chart-patterns", timezone(), range?.from.toISOString() ?? "all", range?.to.toISOString() ?? ""], {tags:["spotify"]})();
}
