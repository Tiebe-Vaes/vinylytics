import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { rowsOf } from "@/db/rows";

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
export async function historyPage(before: string | null, limit = 100): Promise<{ plays: HistoryPlay[]; next: string | null }> {
  if (!hasDb()) return { plays: [], next: null };
  const c = parseCursor(before);
  const res = await db().execute(sql`
    SELECT id, played_at AS "playedAt", track_name AS name, artist_name AS artist, uri, ms_played AS "msPlayed", skipped
    FROM plays
    WHERE kind = 'track' ${c ? sql`AND (played_at, id) < (${c.at}::timestamptz, ${c.id})` : sql``}
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
