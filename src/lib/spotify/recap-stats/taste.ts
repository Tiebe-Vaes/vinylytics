import { sql } from "drizzle-orm";
import { timezone } from "@/lib/tz";
import { local, rangeWhere } from "../queries";
import type { Range } from "../types";
import { rows, type Db } from "./shared";

const STREAM = sql`ms_played >= 30000`;
/** A crush is the 20th full play: past casual, into "on repeat". */
export const CRUSH_PLAYS = 20;
/** Ghosted: at least this much in the first half (five hours, a real habit)… */
const GHOST_MINUTES = 300;
/** …and nothing in the range's last 90 days. */
const GHOST_DAYS = 90;

/** All-time favourites, ranked by minutes like the Charts. */
export type Goat = {
  artist: { name: string; minutes: number } | null;
  track: { uri: string; name: string; artist: string; minutes: number } | null;
};

export async function goat(d: Db): Promise<Goat> {
  const [artist] = await rows<{ name: string; minutes: number }>(d, sql`
    SELECT artist_name AS name, round(sum(ms_played) / 60000.0)::int AS minutes FROM plays
    WHERE kind = 'track' AND artist_name IS NOT NULL GROUP BY artist_name ORDER BY sum(ms_played) DESC, artist_name LIMIT 1`);
  const [track] = await rows<{ uri: string; name: string; artist: string; minutes: number }>(d, sql`
    SELECT uri, max(track_name) AS name, max(artist_name) AS artist, round(sum(ms_played) / 60000.0)::int AS minutes FROM plays
    WHERE kind = 'track' AND uri IS NOT NULL GROUP BY uri ORDER BY sum(ms_played) DESC, uri LIMIT 1`);
  return { artist: artist ?? null, track: track ?? null };
}

export async function monthlyLeaders(d: Db, range: Range) {
  return rows<{ month: string; artist: string; minutes: number }>(d, sql`
    SELECT DISTINCT ON (month) month, artist, minutes FROM (
      SELECT to_char(${local()}, 'YYYY-MM') AS month, artist_name AS artist, round(sum(ms_played) / 60000.0)::int AS minutes, sum(ms_played) AS ms
      FROM plays WHERE kind = 'track' AND artist_name IS NOT NULL AND ${rangeWhere(range)} GROUP BY 1, 2
    ) m ORDER BY month, ms DESC, artist`);
}

export async function crushes(d: Db, range: Range) {
  const reached = await rows<{ track: string; artist: string; days: number }>(d, sql`
    WITH p AS (
      SELECT uri, track_name, artist_name, (${local()})::date AS day, row_number() OVER (PARTITION BY uri ORDER BY played_at) AS n
      FROM plays WHERE kind = 'track' AND uri IS NOT NULL AND ${STREAM} AND ${rangeWhere(range)}
    )
    SELECT max(track_name) AS track, max(artist_name) AS artist,
           (max(day) FILTER (WHERE n = ${CRUSH_PLAYS}) - min(day) FILTER (WHERE n = 1))::int AS days
    FROM p GROUP BY uri HAVING max(n) >= ${CRUSH_PLAYS} ORDER BY days, uri`);
  const ghosted = await rows<{ artist: string; lastPlay: string; minutesBefore: number }>(d, sql`
    WITH b AS (
      SELECT coalesce(${range?.from.toISOString() ?? null}::timestamptz, min(played_at)) AS s,
             coalesce(${range?.to.toISOString() ?? null}::timestamptz, max(played_at)) AS e
      FROM plays
    ), a AS (
      SELECT artist_name AS artist, max(played_at) AS last,
             sum(ms_played) FILTER (WHERE played_at < b.s + (b.e - b.s) / 2) / 60000.0 AS early
      FROM plays, b WHERE kind = 'track' AND artist_name IS NOT NULL AND played_at >= b.s AND played_at < b.e
      GROUP BY artist_name, b.e
      HAVING max(played_at) < b.e - ${GHOST_DAYS} * interval '1 day'
    )
    SELECT artist, to_char(last AT TIME ZONE ${timezone()}, 'YYYY-MM-DD') AS "lastPlay", round(early)::int AS "minutesBefore"
    FROM a WHERE early >= ${GHOST_MINUTES} ORDER BY early DESC, artist LIMIT 3`);
  return { fastest: reached[0] ?? null, slowBurner: reached.length > 1 ? reached.at(-1)! : null, ghosted };
}

/** How the year's taste moved against the year before: new artists (10+ minutes), one comeback, up to three dropped. */
export type TasteShift = { newCount: number; topNew: string | null; comeback: string | null; dropped: string[] };

export async function tasteShift(d: Db, range: Range | null): Promise<TasteShift> {
  if (!range) return { newCount: 0, topNew: null, comeback: null, dropped: [] };
  const prevFrom = new Date(range.from);
  prevFrom.setUTCFullYear(prevFrom.getUTCFullYear() - 1);
  const [shift] = await rows<TasteShift>(d, sql`
    WITH firsts AS (
      SELECT artist_name AS a, min(played_at) AS f FROM plays WHERE kind = 'track' AND artist_name IS NOT NULL AND ${STREAM} GROUP BY 1
    ), cur AS (
      SELECT artist_name AS a, sum(ms_played) / 60000.0 AS m FROM plays
      WHERE kind = 'track' AND artist_name IS NOT NULL AND played_at >= ${range.from.toISOString()}::timestamptz AND played_at < ${range.to.toISOString()}::timestamptz GROUP BY 1
    ), prev AS (
      SELECT artist_name AS a, sum(ms_played) / 60000.0 AS m FROM plays
      WHERE kind = 'track' AND artist_name IS NOT NULL AND played_at >= ${prevFrom.toISOString()}::timestamptz AND played_at < ${range.from.toISOString()}::timestamptz GROUP BY 1
    )
    SELECT
      (SELECT count(*) FROM cur JOIN firsts USING (a) WHERE f >= ${range.from.toISOString()}::timestamptz AND m >= 10)::int AS "newCount",
      (SELECT a FROM cur JOIN firsts USING (a) WHERE f >= ${range.from.toISOString()}::timestamptz AND m >= 10 ORDER BY m DESC, a LIMIT 1) AS "topNew",
      (SELECT a FROM cur JOIN firsts USING (a) WHERE f < ${prevFrom.toISOString()}::timestamptz AND a NOT IN (SELECT a FROM prev) ORDER BY m DESC, a LIMIT 1) AS comeback,
      (SELECT coalesce(array_agg(a ORDER BY m DESC, a), '{}') FROM (SELECT a, m FROM prev WHERE a NOT IN (SELECT a FROM cur) ORDER BY m DESC, a LIMIT 3) x) AS dropped`);
  return { newCount: shift?.newCount ?? 0, topNew: shift?.topNew ?? null, comeback: shift?.comeback ?? null, dropped: shift?.dropped ?? [] };
}
