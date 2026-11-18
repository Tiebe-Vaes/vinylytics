import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { rowsOf } from "@/db/rows";
import { timezone } from "@/lib/tz";
import { local } from "./queries";

export type ListeningDay = {
  day: string;
  minutes: number;
  plays: number;
  topTrack: string | null;
  topArtist: string | null;
};

export function validHistoryDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T12:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Compare instants against local midnights so the played_at index stays usable on DST days.
const midnight = (key: string, following = false) =>
  sql`((${key}::date + ${following ? 1 : 0}::int)::timestamp AT TIME ZONE ${timezone()})`;

export async function listeningDays(from: string, to: string, monthDay?: string): Promise<ListeningDay[]> {
  if (!hasDb() || !validHistoryDay(from) || !validHistoryDay(to) || from > to) return [];
  return rowsOf<ListeningDay>(await db().execute(sql`
    WITH logged AS (
      SELECT to_char(${local()}, 'YYYY-MM-DD') AS day, track_name, artist_name, uri, ms_played
      FROM plays WHERE kind = 'track' AND played_at >= ${midnight(from)} AND played_at < ${midnight(to, true)}
        ${monthDay ? sql`AND to_char(${local()}, 'MM-DD') = ${monthDay}` : sql``}
    ), tracks AS (
      SELECT DISTINCT ON (day) day, max(track_name) AS name FROM logged
      WHERE ms_played >= 30000 AND track_name IS NOT NULL
      GROUP BY day, uri, CASE WHEN uri IS NULL THEN track_name END, CASE WHEN uri IS NULL THEN artist_name END
      ORDER BY day, count(*) DESC, sum(ms_played) DESC, max(track_name), max(artist_name), uri
    ), artists AS (
      SELECT DISTINCT ON (day) day, artist_name FROM logged
      WHERE ms_played >= 30000 AND artist_name IS NOT NULL GROUP BY day, artist_name
      ORDER BY day, count(*) DESC, sum(ms_played) DESC, artist_name
    ), totals AS (
      SELECT day, count(*)::int AS plays, (sum(ms_played) / 60000.0)::float AS minutes
      FROM logged GROUP BY day
    )
    SELECT totals.*, tracks.name AS "topTrack", artists.artist_name AS "topArtist"
    FROM totals LEFT JOIN tracks USING (day) LEFT JOIN artists USING (day) ORDER BY day DESC`));
}

/** Seek straight to the previous listening day, even across months without a play. */
export async function historyDayPage(before: string | null, limit = 10) {
  if (!hasDb()) return { days: [], next: null };
  const cutoff = validHistoryDay(before) ? sql`AND played_at < ${midnight(before)}` : sql``;
  const zone = timezone();
  const keys = rowsOf<{ day: string }>(await db().execute(sql`
    WITH RECURSIVE dates(day, n) AS (
      (SELECT (${local()})::date, 1 FROM plays WHERE kind = 'track' ${cutoff} ORDER BY played_at DESC LIMIT 1)
      UNION ALL
      SELECT prior.day, dates.n + 1 FROM dates CROSS JOIN LATERAL (
        SELECT (${local()})::date AS day FROM plays
        WHERE kind = 'track' AND played_at < (dates.day::timestamp AT TIME ZONE ${zone})
        ORDER BY played_at DESC LIMIT 1
      ) prior WHERE dates.n <= ${limit}
    ) SELECT to_char(day, 'YYYY-MM-DD') AS day FROM dates ORDER BY day DESC`));
  if (!keys.length) return { days: [], next: null };
  const last = keys[Math.min(keys.length, limit) - 1].day;
  return { days: await listeningDays(last, keys[0].day), next: keys.length > limit ? last : null };
}

export type HistoryPlay = {
  id: string;
  playedAt: string;
  name: string | null;
  artist: string | null;
  uri: string | null;
  msPlayed: number;
  skipped: boolean | null;
};

/** Cursor = "<iso played_at>~<id>": ties on played_at are broken by id so no play is skipped between pages. */
function parseCursor(cursor: string | null): { at: string; id: string } | null {
  if (!cursor) return null;
  const [at, id] = cursor.split("~");
  if (!id || Number.isNaN(Date.parse(at))) return null;
  return { at, id };
}

/** One page of the play log, newest first. */
export async function historyPage(before: string | null, limit = 100, day?: string): Promise<{ plays: HistoryPlay[]; next: string | null }> {
  if (!hasDb()) return { plays: [], next: null };
  const c = parseCursor(before);
  const res = await db().execute(sql`
    SELECT id, played_at AS "playedAt", track_name AS name, artist_name AS artist, uri, ms_played AS "msPlayed", skipped
    FROM plays
    WHERE kind = 'track' ${c ? sql`AND (played_at, id) < (${c.at}::timestamptz, ${c.id})` : sql``}
    ${validHistoryDay(day) ? sql`AND played_at >= ${midnight(day)} AND played_at < ${midnight(day, true)}` : sql``}
    ORDER BY played_at DESC, id DESC
    LIMIT ${limit + 1}`);
  const rows = rowsOf<HistoryPlay & { playedAt: string | Date }>(res).map((r) => ({
    ...r,
    playedAt: new Date(r.playedAt).toISOString(),
  }));
  const plays = rows.slice(0, limit);
  const last = plays.at(-1);
  return { plays, next: rows.length > limit && last ? `${last.playedAt}~${last.id}` : null };
}
