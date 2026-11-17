import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { rowsOf } from "@/db/rows";
import { localDateKey } from "@/lib/time";
import { local } from "./queries";

export type WeekSummary = { minutes: number; plays: number; topArtist: string | null; topArtistShare: number };

/** The last 7 local days (today included): music minutes, streams, and who dominated. */
export async function weekSummary(today: string = localDateKey()): Promise<WeekSummary> {
  if (!hasDb()) return { minutes: 0, plays: 0, topArtist: null, topArtistShare: 0 };
  const res = await db().execute(sql`
    SELECT artist_name AS artist, (sum(ms_played) / 60000.0)::float AS minutes,
           count(*) FILTER (WHERE ms_played >= 30000)::int AS plays
    FROM plays
    WHERE kind = 'track' AND artist_name IS NOT NULL
      AND (${local()})::date BETWEEN ${today}::date - 6 AND ${today}::date
    GROUP BY artist_name ORDER BY minutes DESC, artist_name`);
  const rows = rowsOf<{ artist: string; minutes: number; plays: number }>(res);
  const minutes = rows.reduce((s, r) => s + r.minutes, 0);
  const plays = rows.reduce((s, r) => s + r.plays, 0);
  return {
    minutes: Math.round(minutes * 10) / 10,
    plays,
    topArtist: rows[0]?.artist ?? null,
    topArtistShare: minutes ? Math.round((rows[0].minutes / minutes) * 100) / 100 : 0,
  };
}
