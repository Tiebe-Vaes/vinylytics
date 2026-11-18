import { sql } from "drizzle-orm";
import { local, rangeWhere } from "../queries";
import type { Range } from "../types";
import { rows, type Db } from "./shared";

/**
 * Mood days from behaviour, not audio features (Spotify closed those to new
 * apps): each is named for what happened and says how it was measured.
 */
export type MoodDay = { day: string; value: number; detail: string };

/** A restless day needs this many plays with a known skip flag, so one skip isn't 100%. */
const RESTLESS_MIN_PLAYS = 15;
/** A comfort day needs a real listening day behind it. */
const COMFORT_MIN_PLAYS = 10;
/** An old favourite was first heard at least a year before. */
export const COMFORT_AGE_DAYS = 365;
/** Three late plays of one song is a spiral, not a coincidence. */
const SPIRAL_MIN = 3;

const DAY = sql`to_char(${local()}, 'YYYY-MM-DD')`;

export async function moodDays(d: Db, range: Range): Promise<Record<"restless" | "comfort" | "spiral" | "euphoric", MoodDay | null>> {
  const [restless, comfort, spiral, euphoric] = await Promise.all([
    rows<{ day: string; value: number }>(d, sql`
      SELECT ${DAY} AS day, (count(*) FILTER (WHERE skipped)::float / count(*)) AS value FROM plays
      WHERE kind = 'track' AND source = 'export' AND skipped IS NOT NULL AND ${rangeWhere(range)}
      GROUP BY 1 HAVING count(*) >= ${RESTLESS_MIN_PLAYS} ORDER BY value DESC, day LIMIT 1`),
    rows<{ day: string; value: number }>(d, sql`
      WITH first AS (SELECT uri, min(played_at) AS heard FROM plays WHERE kind = 'track' AND uri IS NOT NULL GROUP BY uri)
      SELECT ${DAY} AS day, (count(*) FILTER (WHERE first.heard <= played_at - ${COMFORT_AGE_DAYS} * interval '1 day')::float / count(*)) AS value
      FROM plays JOIN first USING (uri)
      WHERE kind = 'track' AND ${rangeWhere(range)}
      GROUP BY 1 HAVING count(*) >= ${COMFORT_MIN_PLAYS} ORDER BY value DESC, day LIMIT 1`),
    // A night runs 23:00–04:59 and belongs to the evening it started.
    rows<{ day: string; value: number; track: string }>(d, sql`
      SELECT to_char(${local()} - interval '5 hours', 'YYYY-MM-DD') AS day, count(*)::int AS value, max(track_name) AS track FROM plays
      WHERE kind = 'track' AND uri IS NOT NULL AND ms_played >= 30000 AND ${rangeWhere(range)}
        AND (extract(hour FROM ${local()}) >= 23 OR extract(hour FROM ${local()}) < 5)
      GROUP BY 1, uri HAVING count(*) >= ${SPIRAL_MIN} ORDER BY value DESC, day LIMIT 1`),
    rows<{ day: string; value: number; minutes: number }>(d, sql`
      WITH first AS (SELECT uri, min(played_at) AS heard FROM plays WHERE kind = 'track' AND uri IS NOT NULL GROUP BY uri)
      SELECT ${DAY} AS day, count(DISTINCT uri) FILTER (WHERE first.heard = played_at)::int AS value,
             round(sum(ms_played) / 60000.0)::int AS minutes
      FROM plays JOIN first USING (uri)
      WHERE kind = 'track' AND ${rangeWhere(range)}
      GROUP BY 1 HAVING count(DISTINCT uri) FILTER (WHERE first.heard = played_at) > 0
      ORDER BY count(DISTINCT uri) FILTER (WHERE first.heard = played_at) * 10 + sum(ms_played) / 600000.0 DESC, day LIMIT 1`),
  ]);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const r = restless[0], c = comfort[0], s = spiral[0], e = euphoric[0];
  return {
    restless: r ? { day: r.day, value: r.value, detail: `${pct(r.value)} of plays skipped` } : null,
    comfort: c ? { day: c.day, value: c.value, detail: `${pct(c.value)} old favourites` } : null,
    spiral: s ? { day: s.day, value: s.value, detail: `${s.track} ×${s.value} after 23:00` } : null,
    euphoric: e ? { day: e.day, value: e.value, detail: `${e.value} new songs · ${Math.floor(e.minutes / 60)} h ${e.minutes % 60} min` } : null,
  };
}
