import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { rowsOf } from "@/db/rows";
import { timezone } from "@/lib/tz";
import { local, rangeWhere } from "./queries";
import type { Range } from "./types";

export type Insights = {
  albumCompletion: { albumId: string; name: string; artist: string; played: number; total: number }[];
  artistStreaks: { artist: string; days: number; from: string; to: string }[];
};

export async function getInsights(range: Range = null, albumPage = 1, streakPage = 1, limit = 10): Promise<Insights> {
  if (!hasDb()) return { albumCompletion: [], artistStreaks: [] };
  const [albums, streaks] = await Promise.all([
    db().execute(sql`
      SELECT a.id AS "albumId", coalesce(a.name,'Unknown album') AS name, coalesce(a.artist_name,'') AS artist,
             least(count(DISTINCT p.uri), a.total_tracks)::int AS played, a.total_tracks AS total
      FROM plays p JOIN tracks tr ON tr.uri = p.uri JOIN albums a ON a.id = tr.album_id
      WHERE p.kind = 'track' AND p.ms_played >= 30000 AND a.total_tracks > 0 AND ${rangeWhere(range)}
      GROUP BY a.id HAVING count(DISTINCT p.uri) >= 3
      ORDER BY least(count(DISTINCT p.uri), a.total_tracks)::float / a.total_tracks DESC, played DESC, a.id
      LIMIT ${limit + 1} OFFSET ${(albumPage-1)*limit}`),
    db().execute(sql`
      WITH days AS (SELECT DISTINCT artist_name AS artist, (${local()})::date AS day FROM plays
                    WHERE kind='track' AND artist_name IS NOT NULL AND ms_played >= 30000 AND ${rangeWhere(range)}),
      groups AS (SELECT artist,day,day-(row_number() OVER(PARTITION BY artist ORDER BY day))::int AS grp FROM days),
      runs AS (SELECT artist,count(*)::int AS days,min(day) AS first,max(day) AS last FROM groups GROUP BY artist,grp),
      best AS (SELECT DISTINCT ON (artist) * FROM runs ORDER BY artist,days DESC,last DESC)
      SELECT artist,days,to_char(first,'YYYY-MM-DD') AS "from",to_char(last,'YYYY-MM-DD') AS "to" FROM best
      WHERE days >= 2 ORDER BY days DESC, artist LIMIT ${limit + 1} OFFSET ${(streakPage-1)*limit}`)
  ]);
  return {albumCompletion:rowsOf<Insights["albumCompletion"][number]>(albums), artistStreaks:rowsOf<Insights["artistStreaks"][number]>(streaks)};
}

/** Public highlights and background warming use only the two opt-in, all-time lists. */
export function cachedInsights() {
  return unstable_cache(async () => {
    const data = await getInsights();
    return {artistStreaks: data.artistStreaks.slice(0,10), albumCompletion: data.albumCompletion.slice(0,10)};
  }, ["listening-highlights-v2", timezone()], {tags:["spotify","insights"]})();
}
