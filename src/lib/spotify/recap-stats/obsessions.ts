import { sql } from "drizzle-orm";
import { timezone } from "@/lib/tz";
import { local, rangeWhere } from "../queries";
import type { Range } from "../types";
import { rows, type Db } from "./shared";

const STREAM = sql`ms_played >= 30000`;
/** Two plays of one song in a day is the smallest obsession worth naming. */
const OBSESSION_MIN = 2;
/** A peak month with this many plays (almost daily) makes a song a burnout candidate. */
const BURNOUT_PEAK = 25;
/** At most this many plays in every later month means it was dropped. */
const BURNOUT_AFTER = 2;
/** A one-week wonder's best week holds this share of its minutes… */
const WONDER_SHARE = 0.8;
/** …and at least this many minutes, so a single stray play doesn't count. */
const WONDER_MINUTES = 30;

export async function obsession(d: Db, range: Range) {
  const [r] = await rows<{ track: string; artist: string; day: string; plays: number }>(d, sql`
    SELECT max(track_name) AS track, max(artist_name) AS artist, to_char(${local()}, 'YYYY-MM-DD') AS day, count(*)::int AS plays
    FROM plays WHERE kind = 'track' AND uri IS NOT NULL AND ${STREAM} AND ${rangeWhere(range)}
    GROUP BY uri, 3 HAVING count(*) >= ${OBSESSION_MIN} ORDER BY plays DESC, day, uri LIMIT 1`);
  return r ?? null;
}

export async function repeatChampion(d: Db, range: Range) {
  const [r] = await rows<{ track: string; artist: string; run: number; day: string }>(d, sql`
    WITH p AS (
      SELECT uri, track_name, artist_name, played_at,
             row_number() OVER (ORDER BY played_at) - row_number() OVER (PARTITION BY uri ORDER BY played_at) AS grp
      FROM plays WHERE kind = 'track' AND uri IS NOT NULL AND ${STREAM} AND ${rangeWhere(range)}
    )
    SELECT max(track_name) AS track, max(artist_name) AS artist, count(*)::int AS run,
           to_char(min(played_at) AT TIME ZONE ${timezone()}, 'YYYY-MM-DD') AS day
    FROM p GROUP BY uri, grp HAVING count(*) >= 2 ORDER BY run DESC, min(played_at) LIMIT 1`);
  return r ?? null;
}

export async function burnout(d: Db, range: Range) {
  return rows<{ track: string; artist: string; peakMonth: string; peakPlays: number; afterPlays: number }>(d, sql`
    WITH m AS (
      SELECT uri, max(track_name) AS track, max(artist_name) AS artist, to_char(${local()}, 'YYYY-MM') AS month, count(*)::int AS n
      FROM plays WHERE kind = 'track' AND uri IS NOT NULL AND ${STREAM} AND ${rangeWhere(range)} GROUP BY uri, 4
    ), peak AS (SELECT DISTINCT ON (uri) uri, track, artist, month, n FROM m ORDER BY uri, n DESC, month)
    SELECT peak.track, peak.artist, peak.month AS "peakMonth", peak.n AS "peakPlays",
           coalesce((SELECT sum(n) FROM m WHERE m.uri = peak.uri AND m.month > peak.month), 0)::int AS "afterPlays"
    FROM peak
    WHERE peak.n >= ${BURNOUT_PEAK}
      AND NOT EXISTS (SELECT 1 FROM m WHERE m.uri = peak.uri AND m.month > peak.month AND m.n > ${BURNOUT_AFTER})
      AND peak.month < (SELECT max(month) FROM m)
    ORDER BY "peakPlays" DESC, peak.uri LIMIT 3`);
}

export async function oneWeekWonders(d: Db, range: Range) {
  return rows<{ artist: string; week: string; minutes: number }>(d, sql`
    WITH w AS (
      SELECT artist_name AS artist, to_char(date_trunc('week', ${local()}), 'YYYY-MM-DD') AS week, sum(ms_played) / 60000.0 AS minutes
      FROM plays WHERE kind = 'track' AND artist_name IS NOT NULL AND ${rangeWhere(range)} GROUP BY 1, 2
    ), t AS (SELECT artist, sum(minutes) AS total FROM w GROUP BY artist),
    best AS (SELECT DISTINCT ON (artist) artist, week, minutes FROM w ORDER BY artist, minutes DESC, week)
    SELECT best.artist, best.week, round(best.minutes)::int AS minutes FROM best JOIN t USING (artist)
    WHERE best.minutes >= ${WONDER_MINUTES} AND best.minutes >= ${WONDER_SHARE} * t.total
    ORDER BY best.minutes DESC, best.artist LIMIT 3`);
}
