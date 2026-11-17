import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { rowsOf } from "@/db/rows";
import { timezone } from "@/lib/tz";
import { eraInstants } from "./era-covers";
import { getEras, type EraView } from "./eras-data";
import { local } from "./queries";

export type EraTrack = { uri: string; name: string; artist: string; streams: number; minutes: number; cover: string | null };
export type EraDetail = {
  era: EraView;
  next: EraView | null;
  /** The era's tracklist: its 12 most-streamed tracks, side A then side B. */
  tracks: EraTrack[];
  /** Tracks whose first stream ever falls inside this era. */
  firstHeard: number;
  /** Artists whose first stream ever falls inside this era. */
  newArtists: number;
  topDay: { day: string; minutes: number };
};

const STREAM = sql`ms_played >= 30000`;

/** Liner notes for one era; null when no era has this id. */
export async function eraDetail(id: string): Promise<EraDetail | null> {
  if (!hasDb()) return null;
  const { eras } = await getEras();
  const i = eras.findIndex((e) => e.id === id);
  if (i === -1) return null;
  const era = eras[i];
  const { from, to } = eraInstants(era);
  const [s, e] = [from.toISOString(), to.toISOString()];
  // Range on the indexed played_at, not a per-row timezone conversion.
  const inEra = sql`played_at >= ${s}::timestamptz AND played_at < ${e}::timestamptz`;
  const firstIn = sql`min(played_at) >= ${s}::timestamptz AND min(played_at) < ${e}::timestamptz`;
  const d = db();

  const [tracks, firsts, days] = await Promise.all([
    d.execute(sql`
      SELECT p.uri, max(p.track_name) AS name, max(p.artist_name) AS artist,
             count(*) FILTER (WHERE ${STREAM})::int AS streams, (sum(p.ms_played) / 60000.0)::float AS minutes,
             max(t.image_url) AS cover
      FROM plays p LEFT JOIN tracks t ON t.uri = p.uri
      WHERE p.kind = 'track' AND p.uri IS NOT NULL AND ${inEra}
      GROUP BY p.uri ORDER BY streams DESC, minutes DESC, p.uri LIMIT 12`),
    d.execute(sql`
      SELECT
        (SELECT count(*)::int FROM (SELECT uri FROM plays WHERE kind = 'track' AND uri IS NOT NULL AND ${STREAM}
           GROUP BY uri HAVING ${firstIn}) f) AS tracks,
        (SELECT count(*)::int FROM (SELECT artist_name FROM plays WHERE kind = 'track' AND artist_name IS NOT NULL AND ${STREAM}
           GROUP BY artist_name HAVING ${firstIn}) a) AS artists`),
    d.execute(sql`
      SELECT to_char((${local()})::date, 'YYYY-MM-DD') AS day, (sum(ms_played) / 60000.0)::float AS minutes
      FROM plays WHERE kind = 'track' AND ${inEra}
      GROUP BY 1 ORDER BY minutes DESC, day LIMIT 1`),
  ]);

  const f = rowsOf<{ tracks: number; artists: number }>(firsts)[0];
  return {
    era,
    next: eras[i + 1] ?? null,
    tracks: rowsOf<EraTrack>(tracks),
    firstHeard: f?.tracks ?? 0,
    newArtists: f?.artists ?? 0,
    topDay: rowsOf<{ day: string; minutes: number }>(days)[0] ?? { day: era.start, minutes: 0 },
  };
}

export function getEraDetail(id: string): Promise<EraDetail | null> {
  return unstable_cache(() => eraDetail(id), ["era", id, timezone()], { tags: ["spotify"] })();
}
