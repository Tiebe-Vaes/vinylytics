import { eq, sql } from "drizzle-orm";
import { schema } from "@/db";
import { local, rangeWhere } from "../queries";
import type { Range } from "../types";
import { rows, type Db, type SeasonTop } from "./shared";

/** A rainy day has at least 1 mm of rain; a sunny day has WMO code 0 or 1 (clear or mainly clear). */
const RAIN_MM = 1;
const SUNNY_MAX_CODE = 1;

/** Rainy-day you against sunny-day you, from cached weather. Null until the owner sets a city. */
export async function weatherYou(d: Db, range: Range) {
  const [s] = await d.select().from(schema.settings).where(eq(schema.settings.id, "owner")).limit(1);
  if (!s?.weatherCity) return null;
  const list = await rows<SeasonTop & { kind: "rainy" | "sunny"; days: number }>(d, sql`
    WITH p AS (
      SELECT CASE WHEN w.precip_mm >= ${RAIN_MM} THEN 'rainy' WHEN w.code <= ${SUNNY_MAX_CODE} THEN 'sunny' END AS kind,
             to_char(${local()}, 'YYYY-MM-DD') AS day, artist_name, track_name, uri, ms_played
      FROM plays JOIN weather_days w ON w.day = to_char(${local()}, 'YYYY-MM-DD')
      WHERE kind = 'track' AND artist_name IS NOT NULL AND ${rangeWhere(range)}
    ), k AS (SELECT * FROM p WHERE kind IS NOT NULL),
    artist AS (SELECT DISTINCT ON (kind) kind, artist_name FROM k GROUP BY kind, artist_name ORDER BY kind, sum(ms_played) DESC, artist_name),
    track AS (SELECT DISTINCT ON (kind) kind, max(track_name) AS track_name FROM k GROUP BY kind, uri ORDER BY kind, sum(ms_played) DESC, uri),
    total AS (SELECT kind, round(sum(ms_played) / 60000.0)::int AS minutes, count(DISTINCT day)::int AS days FROM k GROUP BY kind)
    SELECT total.kind, artist.artist_name AS artist, coalesce(track.track_name, 'Unknown') AS track, total.minutes, total.days
    FROM total JOIN artist USING (kind) JOIN track USING (kind)`);
  if (!list.length) return null;
  const pick = (k: "rainy" | "sunny") => {
    const r = list.find((row) => row.kind === k);
    return r ? { artist: r.artist, track: r.track, minutes: r.minutes } : null;
  };
  return { city: s.weatherCity, rainyDays: list.find((r) => r.kind === "rainy")?.days ?? 0, rainy: pick("rainy"), sunny: pick("sunny") };
}
