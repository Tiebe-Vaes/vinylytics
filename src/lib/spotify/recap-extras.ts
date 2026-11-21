import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { db, hasDb, schema } from "@/db";
import { localDateKey } from "@/lib/time";
import { timezone } from "@/lib/tz";
import { ensureWeather } from "@/lib/weather";
import { topItems } from "./charts";
import { recapDates } from "./recap";
import { hourWeekdayGrid } from "./recap-stats/fingerprint";
import { longestSession, nightOwl, seasons } from "./recap-stats/habits";
import { moodDays } from "./recap-stats/mood";
import { burnout, obsession, oneWeekWonders, repeatChampion } from "./recap-stats/obsessions";
import { crushes, goat, monthlyLeaders, tasteShift } from "./recap-stats/taste";
import { weatherYou } from "./recap-stats/weather";

async function loadRecapExtras(year: number, today: string) {
  const d = db();
  const { from, to, range } = recapDates(year, today);
  const [owner] = await d.select().from(schema.settings).where(eq(schema.settings.id, "owner")).limit(1);
  if (owner?.weatherLat != null && owner.weatherLon != null) await ensureWeather(from, to, owner.weatherLat, owner.weatherLon);
  const [owl, season, session, obsessed, repeat, burned, wonders, best, race, crush, mood, grid, weather, topArtists, shift] = await Promise.all([
    nightOwl(d, range), seasons(d, range), longestSession(d, range), obsession(d, range), repeatChampion(d, range),
    burnout(d, range), oneWeekWonders(d, range), goat(d), monthlyLeaders(d, range), crushes(d, range),
    moodDays(d, range), hourWeekdayGrid(d, range), weatherYou(d, range),
    topItems({ kind: "artist", ...range, sort: "time", limit: 15 }), tasteShift(d, range),
  ]);
  return { owl, season, session, obsessed, repeat, burned, wonders, best, race, crush, mood, grid, weather, topArtists, shift };
}

export type RecapExtras = Awaited<ReturnType<typeof loadRecapExtras>>;

/** Every new recap stat for one year, cached until the next sync or import. */
export function getRecapExtras(year: number): Promise<RecapExtras | null> {
  if (!hasDb()) return Promise.resolve(null);
  const today = localDateKey();
  return unstable_cache(() => loadRecapExtras(year, today), ["recap-extras-v3", String(year), timezone(), recapDates(year, today).to], { tags: ["spotify", "insights"] })();
}
