import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { rowsOf } from "@/db/rows";
import { timezone } from "@/lib/tz";
import type { Range, TopItem } from "./types";

/**
 * SQL aggregates over plays. Buckets are local dates in TIMEZONE;
 * a "stream" is a play of at least 30 s, matching Spotify; minutes count all.
 */

/** played_at as local wall-clock time in TIMEZONE, bound as a parameter. */
export const local = () => sql`(played_at AT TIME ZONE ${timezone()})`;
const STREAM = sql`ms_played >= 30000`;
const MINUTES = sql`(sum(ms_played) / 60000.0)::float`;

export function rangeWhere(range: Range): SQL {
  if (!range) return sql`true`;
  return sql`played_at >= ${range.from.toISOString()} AND played_at < ${range.to.toISOString()}`;
}

async function rows<T>(query: SQL): Promise<T[]> {
  const res = await db().execute(query);
  return rowsOf<T>(res);
}

export function minutesByMonth(range: Range) {
  return rows<{ month: string; minutes: number }>(sql`
    SELECT to_char(${local()}, 'YYYY-MM') AS month, ${MINUTES} AS minutes
    FROM plays WHERE ${rangeWhere(range)}
    GROUP BY 1 ORDER BY 1`);
}

export function minutesByDay(range: Range) {
  return rows<{ date: string; minutes: number }>(sql`
    SELECT to_char(${local()}, 'YYYY-MM-DD') AS date, ${MINUTES} AS minutes
    FROM plays WHERE ${rangeWhere(range)}
    GROUP BY 1 ORDER BY 1`);
}

export async function streamDayKeys(): Promise<string[]> {
  const r = await rows<{ date: string }>(sql`
    SELECT DISTINCT to_char(${local()}, 'YYYY-MM-DD') AS date
    FROM plays WHERE ${STREAM}`);
  return r.map((x) => x.date);
}

/** Average minutes per weekday (0 = Monday), over the days you listened. */
export function weekdayAverages(range: Range) {
  return rows<{ weekday: number; avgMinutes: number }>(sql`
    SELECT weekday, avg(minutes)::float AS "avgMinutes" FROM (
      SELECT (extract(isodow FROM ${local()})::int - 1) AS weekday,
             date_trunc('day', ${local()}) AS day, ${MINUTES} AS minutes
      FROM plays WHERE ${rangeWhere(range)} GROUP BY 1, 2
    ) d GROUP BY weekday ORDER BY weekday`);
}

export async function totals(range: Range) {
  const [t] = await rows<{ minutes: number | null; streams: number; tracks: number; artists: number }>(sql`
    SELECT ${MINUTES} AS minutes,
           count(*) FILTER (WHERE ${STREAM})::int AS streams,
           count(DISTINCT uri) FILTER (WHERE ${STREAM} AND kind = 'track')::int AS tracks,
           count(DISTINCT artist_name) FILTER (WHERE ${STREAM} AND kind = 'track')::int AS artists
    FROM plays WHERE ${rangeWhere(range)}`);
  return { minutes: t?.minutes ?? 0, streams: t?.streams ?? 0, tracks: t?.tracks ?? 0, artists: t?.artists ?? 0 };
}

const spotifyUrl = (uri: string | null) => {
  const [, type, id] = uri?.split(":") ?? [];
  return type && id ? `https://open.spotify.com/${type}/${id}` : null;
};

export async function topArtistsDb(range: Range, limit: number): Promise<TopItem[]> {
  const r = await rows<{ name: string; minutes: number; streams: number; image: string | null; id: string | null }>(sql`
    SELECT p.artist_name AS name, ${MINUTES} AS minutes,
           count(*) FILTER (WHERE ${STREAM})::int AS streams,
           max(a.image_url) AS image, max(a.spotify_id) AS id
    FROM plays p LEFT JOIN artists a ON a.name = p.artist_name
    WHERE p.kind = 'track' AND p.artist_name IS NOT NULL AND ${rangeWhere(range)}
    GROUP BY p.artist_name ORDER BY minutes DESC LIMIT ${limit}`);
  return r.map((x) => ({
    name: x.name,
    subtitle: "",
    imageUrl: x.image,
    url: x.id ? `https://open.spotify.com/artist/${x.id}` : null,
    minutes: x.minutes,
    streams: x.streams,
  }));
}

export async function topTracksDb(range: Range, limit: number): Promise<TopItem[]> {
  const r = await rows<{ uri: string; name: string; artist: string | null; minutes: number; streams: number; image: string | null }>(sql`
    SELECT p.uri, max(p.track_name) AS name, max(p.artist_name) AS artist, ${MINUTES} AS minutes,
           count(*) FILTER (WHERE ${STREAM})::int AS streams, max(t.image_url) AS image
    FROM plays p LEFT JOIN tracks t ON t.uri = p.uri
    WHERE p.kind = 'track' AND p.uri IS NOT NULL AND ${rangeWhere(range)}
    GROUP BY p.uri ORDER BY streams DESC, minutes DESC LIMIT ${limit}`);
  return r.map((x) => ({
    name: x.name,
    subtitle: x.artist ?? "",
    imageUrl: x.image,
    url: spotifyUrl(x.uri),
    minutes: x.minutes,
    streams: x.streams,
  }));
}

/** Minutes per (weekday 0 = Monday, hour 0-23). */
export function hourWeekday(range: Range) {
  return rows<{ weekday: number; hour: number; minutes: number }>(sql`
    SELECT (extract(isodow FROM ${local()})::int - 1) AS weekday,
           extract(hour FROM ${local()})::int AS hour, ${MINUTES} AS minutes
    FROM plays WHERE ${rangeWhere(range)} GROUP BY 1, 2`);
}

export function artistMonthMinutes(range: Range) {
  return rows<{ month: string; artist: string; minutes: number }>(sql`
    SELECT to_char(${local()}, 'YYYY-MM') AS month, artist_name AS artist, ${MINUTES} AS minutes
    FROM plays
    WHERE kind = 'track' AND artist_name IS NOT NULL AND ${rangeWhere(range)}
    GROUP BY 1, 2`);
}

export function artistMinutes(range: Range) {
  return rows<{ name: string; minutes: number }>(sql`
    SELECT artist_name AS name, ${MINUTES} AS minutes
    FROM plays
    WHERE kind = 'track' AND artist_name IS NOT NULL AND ${rangeWhere(range)}
    GROUP BY 1`);
}

export async function artistTags(): Promise<Map<string, string[]>> {
  const r = await rows<{ name: string; tags: string[] }>(sql`
    SELECT name, tags FROM artists WHERE jsonb_array_length(tags) > 0`);
  return new Map(r.map((x) => [x.name, x.tags]));
}

export function trackDayCounts(range: Range) {
  return rows<{ uri: string; name: string; artist: string; day: string; streams: number }>(sql`
    SELECT uri, max(track_name) AS name, coalesce(max(artist_name), '') AS artist,
           to_char(${local()}, 'YYYY-MM-DD') AS day, count(*)::int AS streams
    FROM plays
    WHERE kind = 'track' AND uri IS NOT NULL AND ${STREAM} AND ${rangeWhere(range)}
    GROUP BY uri, day`);
}

export async function allTimeTrackStreams(uris: string[]): Promise<Map<string, number>> {
  if (uris.length === 0) return new Map();
  const r = await rows<{ uri: string; streams: number }>(sql`
    SELECT uri, count(*)::int AS streams FROM plays
    WHERE ${STREAM} AND uri IN (${sql.join(uris.map((u) => sql`${u}`), sql`, `)})
    GROUP BY uri`);
  return new Map(r.map((x) => [x.uri, x.streams]));
}

/** Artists whose first-ever stream falls in each month of the range. */
export function newArtistsByMonth(range: Range) {
  return rows<{ month: string; count: number; names: string[] }>(sql`
    WITH firsts AS (
      SELECT artist_name, min(played_at) AS first_at, ${MINUTES} AS minutes
      FROM plays WHERE kind = 'track' AND artist_name IS NOT NULL AND ${STREAM}
      GROUP BY artist_name
    )
    SELECT to_char(first_at AT TIME ZONE ${timezone()}, 'YYYY-MM') AS month,
           count(*)::int AS count,
           (array_agg(artist_name ORDER BY minutes DESC))[1:5] AS names
    FROM firsts
    WHERE ${range ? sql`first_at >= ${range.from.toISOString()} AND first_at < ${range.to.toISOString()}` : sql`true`}
    GROUP BY 1 ORDER BY 1`);
}

export type SkipRow = { name: string; subtitle: string; plays: number; skipRate: number };

/** Export rows only: API plays carry no skip data. */
export async function skipRates(minStreams = 10): Promise<{ tracks: SkipRow[]; artists: SkipRow[] }> {
  const base = sql`FROM plays WHERE source = 'export' AND skipped IS NOT NULL AND kind = 'track'`;
  const [tracks, artists] = await Promise.all([
    rows<SkipRow>(sql`
      SELECT max(track_name) AS name, coalesce(max(artist_name), '') AS subtitle, count(*)::int AS plays,
             avg(skipped::int)::float AS "skipRate"
      ${base} AND uri IS NOT NULL GROUP BY uri HAVING count(*) >= ${minStreams} AND bool_or(skipped)
      ORDER BY "skipRate" DESC, plays DESC LIMIT 10`),
    rows<SkipRow>(sql`
      SELECT artist_name AS name, '' AS subtitle, count(*)::int AS plays,
             avg(skipped::int)::float AS "skipRate"
      ${base} AND artist_name IS NOT NULL GROUP BY artist_name HAVING count(*) >= ${minStreams} AND bool_or(skipped)
      ORDER BY "skipRate" DESC, plays DESC LIMIT 10`),
  ]);
  return { tracks, artists };
}

export function kindSplit(range: Range) {
  return rows<{ kind: "track" | "episode" | "audiobook"; minutes: number }>(sql`
    SELECT kind, ${MINUTES} AS minutes FROM plays WHERE ${rangeWhere(range)}
    GROUP BY kind ORDER BY minutes DESC`);
}
