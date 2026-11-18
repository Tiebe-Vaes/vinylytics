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
  return rows<{ month: string; minutes: number; streams:number }>(sql`
    SELECT to_char(${local()}, 'YYYY-MM') AS month, ${MINUTES} AS minutes, count(*) FILTER (WHERE ${STREAM})::int AS streams
    FROM plays WHERE ${rangeWhere(range)}
    GROUP BY 1 ORDER BY 1`);
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

export type SkipRow = { name: string; subtitle: string; plays: number; skipRate: number };

/** Export rows only: API plays carry no skip data. */
export async function skipRates(minStreams = 10, range: Range = null, limit = 10): Promise<{ tracks: SkipRow[]; artists: SkipRow[] }> {
  const base = sql`FROM plays WHERE source = 'export' AND skipped IS NOT NULL AND kind = 'track' AND ${rangeWhere(range)}`;
  const [tracks, artists] = await Promise.all([
    rows<SkipRow>(sql`
      SELECT max(track_name) AS name, coalesce(max(artist_name), '') AS subtitle, count(*)::int AS plays,
             avg(skipped::int)::float AS "skipRate"
      ${base} AND uri IS NOT NULL GROUP BY uri HAVING count(*) >= ${minStreams} AND bool_or(skipped)
      ORDER BY "skipRate" DESC, plays DESC, uri LIMIT ${limit}`),
    rows<SkipRow>(sql`
      SELECT artist_name AS name, '' AS subtitle, count(*)::int AS plays,
             avg(skipped::int)::float AS "skipRate"
      ${base} AND artist_name IS NOT NULL GROUP BY artist_name HAVING count(*) >= ${minStreams} AND bool_or(skipped)
      ORDER BY "skipRate" DESC, plays DESC, artist_name LIMIT ${limit}`),
  ]);
  return { tracks, artists };
}

export function kindSplit(range: Range) {
  return rows<{ kind: "track" | "episode" | "audiobook"; minutes: number }>(sql`
    SELECT kind, ${MINUTES} AS minutes FROM plays WHERE ${rangeWhere(range)}
    GROUP BY kind ORDER BY minutes DESC`);
}
