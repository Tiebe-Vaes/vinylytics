import { sql } from "drizzle-orm";
import { timezone } from "@/lib/tz";
import { local, rangeWhere } from "../queries";
import type { Range } from "../types";
import { rows, type Db, type SeasonTop } from "./shared";

/** Night owl from this share of minutes between 00:00 and 04:59: about one night session a week. */
const NIGHT_OWL_SHARE = 0.15;
/** Early bird from this share between 05:00 and 08:59: a daily commute's worth. */
const EARLY_BIRD_SHARE = 0.2;
/** A pause longer than this ends a listening session: long enough for a meal, short enough to mean you stopped. */
export const SESSION_GAP_MS = 30 * 60_000;

export async function nightOwl(d: Db, range: Range) {
  const [r] = await rows<{ total: number | null; night: number | null; morning: number | null }>(d, sql`
    SELECT sum(ms_played)::float AS total,
           coalesce(sum(ms_played) FILTER (WHERE extract(hour FROM ${local()}) < 5), 0)::float AS night,
           coalesce(sum(ms_played) FILTER (WHERE extract(hour FROM ${local()}) BETWEEN 5 AND 8), 0)::float AS morning
    FROM plays WHERE kind = 'track' AND ms_played > 0 AND ${rangeWhere(range)}`);
  if (!r?.total) return null;
  const share = (r.night ?? 0) / r.total;
  const persona = share >= NIGHT_OWL_SHARE ? "Night owl" as const
    : (r.morning ?? 0) / r.total >= EARLY_BIRD_SHARE ? "Early bird" as const : "Daylight listener" as const;
  return { share, persona };
}

/** Summer is June–August and winter December–February, in local months. */
export async function seasons(d: Db, range: Range): Promise<{ summer: SeasonTop | null; winter: SeasonTop | null } | null> {
  const list = await rows<SeasonTop & { season: "summer" | "winter" }>(d, sql`
    WITH s AS (
      SELECT CASE WHEN extract(month FROM ${local()}) IN (6, 7, 8) THEN 'summer'
                  WHEN extract(month FROM ${local()}) IN (12, 1, 2) THEN 'winter' END AS season,
             artist_name, track_name, uri, ms_played
      FROM plays WHERE kind = 'track' AND artist_name IS NOT NULL AND ${rangeWhere(range)}
    ), seasoned AS (SELECT * FROM s WHERE season IS NOT NULL),
    artist AS (SELECT DISTINCT ON (season) season, artist_name FROM seasoned GROUP BY season, artist_name ORDER BY season, sum(ms_played) DESC, artist_name),
    track AS (SELECT DISTINCT ON (season) season, max(track_name) AS track_name FROM seasoned GROUP BY season, uri ORDER BY season, sum(ms_played) DESC, uri),
    total AS (SELECT season, (sum(ms_played) / 60000.0)::float AS minutes FROM seasoned GROUP BY season)
    SELECT total.season, artist.artist_name AS artist, coalesce(track.track_name, 'Unknown') AS track, round(total.minutes)::int AS minutes
    FROM total JOIN artist USING (season) JOIN track USING (season)`);
  if (!list.length) return null;
  const pick = (s: "summer" | "winter") => {
    const row = list.find((r) => r.season === s);
    return row ? { artist: row.artist, track: row.track, minutes: row.minutes } : null;
  };
  return { summer: pick("summer"), winter: pick("winter") };
}

export async function longestSession(d: Db, range: Range) {
  const [r] = await rows<{ start: string; minutes: number; plays: number }>(d, sql`
    WITH p AS (
      SELECT played_at, ms_played,
             lag(played_at + ms_played * interval '1 millisecond') OVER (ORDER BY played_at) AS prev_end
      FROM plays WHERE kind = 'track' AND ms_played > 0 AND ${rangeWhere(range)}
    ), g AS (
      SELECT *, sum(CASE WHEN prev_end IS NULL OR played_at - prev_end > ${SESSION_GAP_MS} * interval '1 millisecond' THEN 1 ELSE 0 END)
               OVER (ORDER BY played_at) AS grp
      FROM p
    )
    SELECT to_char(min(played_at) AT TIME ZONE ${timezone()}, 'YYYY-MM-DD"T"HH24:MI') AS start,
           round(sum(ms_played) / 60000.0)::int AS minutes, count(*)::int AS plays
    FROM g GROUP BY grp ORDER BY sum(ms_played) DESC, min(played_at) LIMIT 1`);
  return r ?? null;
}
