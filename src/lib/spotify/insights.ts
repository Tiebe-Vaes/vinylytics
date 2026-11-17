import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rowsOf } from "@/db/rows";
import { localDateKey } from "@/lib/time";
import { timezone } from "@/lib/tz";
import { local } from "./queries";

/**
 * The stats nobody else shows. One SQL query per field; days are local days
 * in TIMEZONE, and "today" is passed in so every query agrees on it.
 */

export const BSIDE_MIN_STREAMS = 20;
export const SILENT_DAYS = 180;
export const REISSUE_GAP_DAYS = 180;
export const REISSUE_MIN_AFTER = 3;
export const LOYAL_MIN_STREAMS = 10;
export const LOYAL_MONTH_SHARE = 0.5;
export const ONE_AND_DONE_DAYS = 30;
export const COMPLETION_MIN_TRACKS = 3;
const TOP = 20;

export type Insights = {
  bSides: { uri: string; name: string; artist: string; streams: number; lastPlay: string }[];
  reissues: { uri: string; name: string; artist: string; gapDays: number; backOn: string; streamsAfter: number }[];
  newVsFamiliar: { month: string; newMinutes: number; familiarMinutes: number }[];
  loyalty: {
    stayers: { artist: string; activeMonthShare: number; streams: number }[];
    oneAndDone: { artist: string; streams: number; firstPlay: string }[];
  };
  onThisDay: {
    year: number;
    firstHeard: { name: string; artist: string }[];
    topTrack: { name: string; artist: string; streams: number } | null;
  }[];
  albumCompletion: { albumId: string; name: string; artist: string; played: number; total: number }[];
  artistStreaks: { artist: string; days: number; from: string; to: string }[];
};

const STREAM = sql`ms_played >= 30000`;
/** Streams of music tracks, with their local day. */
const streams = () => sql`(
  SELECT uri, track_name, artist_name, (${local()})::date AS day
  FROM plays WHERE kind = 'track' AND uri IS NOT NULL AND ${STREAM}
) s`;

async function all<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  return rowsOf<T>(await db().execute(query));
}

export async function getInsights(today: string = localDateKey()): Promise<Insights> {
  const t = sql`${today}::date`;

  const [bSides, reissues, newVsFamiliar, loyal, firstHeard, topTracks, albumCompletion, artistStreaks] = await Promise.all([
    all<Insights["bSides"][number]>(sql`
      SELECT uri, max(track_name) AS name, max(artist_name) AS artist, count(*)::int AS streams,
             to_char(max(day), 'YYYY-MM-DD') AS "lastPlay"
      FROM ${streams()} GROUP BY uri
      HAVING count(*) >= ${BSIDE_MIN_STREAMS} AND max(day) <= ${t} - ${SILENT_DAYS}::int
      ORDER BY streams DESC, uri LIMIT ${TOP}`),

    all<Insights["reissues"][number]>(sql`
      WITH s AS (SELECT * FROM ${streams()}),
      g AS (SELECT uri, day, day - lag(day) OVER (PARTITION BY uri ORDER BY day) AS gap FROM s),
      c AS (SELECT DISTINCT ON (uri) uri, day AS back_on, gap FROM g WHERE gap >= ${REISSUE_GAP_DAYS}::int ORDER BY uri, day DESC)
      SELECT c.uri, max(s.track_name) AS name, max(s.artist_name) AS artist, c.gap::int AS "gapDays",
             to_char(c.back_on, 'YYYY-MM-DD') AS "backOn", count(*)::int AS "streamsAfter"
      FROM c JOIN s ON s.uri = c.uri AND s.day >= c.back_on
      GROUP BY c.uri, c.gap, c.back_on HAVING count(*) >= ${REISSUE_MIN_AFTER}
      ORDER BY "streamsAfter" DESC, c.uri LIMIT ${TOP}`),

    all<Insights["newVsFamiliar"][number]>(sql`
      WITH f AS (SELECT uri, to_char(min(day), 'YYYY-MM') AS first_month FROM ${streams()} GROUP BY uri),
      m AS (SELECT uri, to_char(${local()}, 'YYYY-MM') AS month, ms_played FROM plays WHERE kind = 'track' AND uri IS NOT NULL)
      SELECT m.month,
             (coalesce(sum(m.ms_played) FILTER (WHERE coalesce(f.first_month, m.month) = m.month), 0) / 60000.0)::float AS "newMinutes",
             (coalesce(sum(m.ms_played) FILTER (WHERE f.first_month < m.month), 0) / 60000.0)::float AS "familiarMinutes"
      FROM m LEFT JOIN f ON f.uri = m.uri GROUP BY m.month ORDER BY m.month`),

    all<{ artist: string; streams: number; share: number; span: number; first: string; last: string }>(sql`
      SELECT artist_name AS artist, count(*)::int AS streams,
             (count(DISTINCT to_char(day, 'YYYY-MM'))::float
               / ((extract(year FROM ${t}) * 12 + extract(month FROM ${t}))
                  - (extract(year FROM min(day)) * 12 + extract(month FROM min(day))) + 1))::float AS share,
             (max(day) - min(day))::int AS span,
             to_char(min(day), 'YYYY-MM-DD') AS first
      FROM (SELECT artist_name, (${local()})::date AS day FROM plays
            WHERE kind = 'track' AND artist_name IS NOT NULL AND ${STREAM}) a
      GROUP BY artist_name
      HAVING count(*) >= ${LOYAL_MIN_STREAMS} AND min(day) <= ${t} - ${SILENT_DAYS}::int`),

    all<{ day: string; name: string; artist: string }>(sql`
      WITH s AS (SELECT * FROM ${streams()}), f AS (SELECT uri, min(day) AS first_day FROM s GROUP BY uri)
      SELECT to_char(s.day, 'YYYY-MM-DD') AS day, max(s.track_name) AS name, max(s.artist_name) AS artist
      FROM s JOIN f ON f.uri = s.uri AND f.first_day = s.day
      WHERE to_char(s.day, 'MM-DD') = to_char(${t}, 'MM-DD') AND s.day < ${t}
      GROUP BY s.day, s.uri ORDER BY s.day DESC, name`),

    all<{ day: string; name: string; artist: string; streams: number }>(sql`
      SELECT DISTINCT ON (day) to_char(day, 'YYYY-MM-DD') AS day, max(track_name) AS name, max(artist_name) AS artist, count(*)::int AS streams
      FROM ${streams()}
      WHERE to_char(day, 'MM-DD') = to_char(${t}, 'MM-DD') AND day < ${t}
      GROUP BY day, uri ORDER BY day DESC, count(*) DESC, uri`),

    all<Insights["albumCompletion"][number]>(sql`
      SELECT a.id AS "albumId", a.name, a.artist_name AS artist,
             least(count(DISTINCT p.uri), a.total_tracks)::int AS played, a.total_tracks AS total
      FROM plays p JOIN tracks tr ON tr.uri = p.uri JOIN albums a ON a.id = tr.album_id
      WHERE p.kind = 'track' AND p.ms_played >= 30000 AND a.total_tracks IS NOT NULL
      GROUP BY a.id HAVING count(DISTINCT p.uri) >= ${COMPLETION_MIN_TRACKS}
      ORDER BY least(count(DISTINCT p.uri), a.total_tracks)::float / a.total_tracks DESC, played DESC, a.id
      LIMIT ${TOP}`),

    all<Insights["artistStreaks"][number]>(sql`
      WITH d AS (SELECT DISTINCT artist_name AS artist, (${local()})::date AS day FROM plays
                 WHERE kind = 'track' AND artist_name IS NOT NULL AND ${STREAM}),
      g AS (SELECT artist, day, day - (row_number() OVER (PARTITION BY artist ORDER BY day))::int AS grp FROM d),
      r AS (SELECT artist, count(*)::int AS days, min(day) AS f, max(day) AS l FROM g GROUP BY artist, grp),
      best AS (SELECT DISTINCT ON (artist) artist, days, f, l FROM r ORDER BY artist, days DESC, l DESC)
      SELECT artist, days, to_char(f, 'YYYY-MM-DD') AS "from", to_char(l, 'YYYY-MM-DD') AS "to"
      FROM best WHERE days >= 2 ORDER BY days DESC, artist LIMIT ${TOP}`),
  ]);

  const years = [...new Set([...firstHeard, ...topTracks].map((r) => r.day))].sort().reverse();

  return {
    bSides,
    reissues,
    newVsFamiliar,
    loyalty: {
      stayers: loyal
        .filter((a) => a.share >= LOYAL_MONTH_SHARE)
        .sort((a, b) => b.share - a.share || b.streams - a.streams)
        .slice(0, TOP)
        .map((a) => ({ artist: a.artist, activeMonthShare: a.share, streams: a.streams })),
      oneAndDone: loyal
        .filter((a) => a.span <= ONE_AND_DONE_DAYS)
        .sort((a, b) => b.streams - a.streams || a.artist.localeCompare(b.artist))
        .slice(0, TOP)
        .map((a) => ({ artist: a.artist, streams: a.streams, firstPlay: a.first })),
    },
    onThisDay: years.map((day) => {
      const top = topTracks.find((r) => r.day === day);
      return {
        year: Number(day.slice(0, 4)),
        firstHeard: firstHeard.filter((r) => r.day === day).map(({ name, artist }) => ({ name, artist })),
        topTrack: top ? { name: top.name, artist: top.artist, streams: top.streams } : null,
      };
    }),
    albumCompletion,
    artistStreaks,
  };
}

/** getInsights for pages: cached until the next sync or import, per TIMEZONE and day. */
export function cachedInsights(): Promise<Insights> {
  const today = localDateKey();
  return unstable_cache(() => getInsights(today), ["insights", timezone(), today], { tags: ["spotify"] })();
}
