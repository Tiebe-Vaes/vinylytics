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
  /** The era's 12 most-streamed tracks. */
  tracks: EraTrack[];
  topDay: { day: string; minutes: number };
  /** Minutes per 7-day stretch from the era's first day; shapes the share card. */
  weekly: number[];
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
  const d = db();

  const [tracks, days] = await Promise.all([
    d.execute(sql`
      SELECT p.uri, max(p.track_name) AS name, max(p.artist_name) AS artist,
             count(*) FILTER (WHERE ${STREAM})::int AS streams, (sum(p.ms_played) / 60000.0)::float AS minutes,
             max(t.image_url) AS cover
      FROM plays p LEFT JOIN tracks t ON t.uri = p.uri
      WHERE p.kind = 'track' AND p.uri IS NOT NULL AND ${inEra}
      GROUP BY p.uri ORDER BY streams DESC, minutes DESC, p.uri LIMIT 12`),
    d.execute(sql`
      SELECT to_char((${local()})::date, 'YYYY-MM-DD') AS day, (sum(ms_played) / 60000.0)::float AS minutes
      FROM plays WHERE kind = 'track' AND ${inEra}
      GROUP BY 1 ORDER BY day`),
  ]);

  const byDay = rowsOf<{ day: string; minutes: number }>(days);
  const weekly = Array<number>(Math.max(1, era.weeks)).fill(0);
  const start = Date.parse(`${era.start}T00:00:00Z`);
  for (const d of byDay) {
    const w = Math.floor((Date.parse(`${d.day}T00:00:00Z`) - start) / (7 * 86_400_000));
    if (w >= 0 && w < weekly.length) weekly[w] += d.minutes;
  }
  // Ties go to the earliest day, as the old ORDER BY minutes DESC, day did.
  const topDay = byDay.reduce<{ day: string; minutes: number } | null>((best, d) => (!best || d.minutes > best.minutes ? d : best), null);
  return {
    era,
    next: eras[i + 1] ?? null,
    tracks: rowsOf<EraTrack>(tracks),
    topDay: topDay ?? { day: era.start, minutes: 0 },
    weekly,
  };
}

export function getEraDetail(id: string): Promise<EraDetail | null> {
  return unstable_cache(() => eraDetail(id), ["era", "v2-weekly", id, timezone()], { tags: ["spotify"] })();
}
