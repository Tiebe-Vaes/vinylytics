import { unstable_cache } from "next/cache";
import { sql, type SQL } from "drizzle-orm";
import { localDateKey } from "@/lib/time";
import { timezone } from "@/lib/tz";
import { chartRange, type ChartRange } from "./data";
import { db, hasDb } from "@/db";
import { rowsOf } from "@/db/rows";
import { albumHref, artistHref, trackHref } from "@/lib/href";

export type ChartKind = "artist" | "track" | "album";
export type ChartSort = "time" | "plays";
export type ChartItem = {
  key: string;
  name: string;
  subtitle: string;
  cover: string | null;
  minutes: number;
  streams: number;
  /** Deep-dive page for this item. */
  href: string;
};

const STREAM = sql`p.ms_played >= 30000`;

/** Top artists, tracks or albums over any range (null = open end), sorted by listening time or by plays. */
export async function topItems(q: {
  kind: ChartKind;
  from: Date | null;
  to: Date | null;
  sort: ChartSort;
  limit: number;
}): Promise<ChartItem[]> {
  if (!hasDb()) return [];
  const where: SQL[] = [sql`p.kind = 'track'`];
  if (q.from) where.push(sql`p.played_at >= ${q.from.toISOString()}`);
  if (q.to) where.push(sql`p.played_at < ${q.to.toISOString()}`);
  const range = sql.join(where, sql` AND `);
  const order = q.sort === "plays" ? sql`streams DESC, minutes DESC` : sql`minutes DESC, streams DESC`;
  const totals = sql`(sum(p.ms_played) / 60000.0)::float AS minutes, count(*) FILTER (WHERE ${STREAM})::int AS streams`;

  const query =
    q.kind === "artist"
      ? sql`SELECT p.artist_name AS key, p.artist_name AS name, '' AS subtitle, max(a.image_url) AS cover, ${totals}
            FROM plays p LEFT JOIN artists a ON a.name = p.artist_name
            WHERE ${range} AND p.artist_name IS NOT NULL GROUP BY p.artist_name`
      : q.kind === "track"
        ? sql`SELECT p.uri AS key, max(p.track_name) AS name, max(p.artist_name) AS subtitle, max(t.image_url) AS cover, ${totals}
              FROM plays p LEFT JOIN tracks t ON t.uri = p.uri
              WHERE ${range} AND p.uri IS NOT NULL GROUP BY p.uri`
        : sql`SELECT al.id AS key, max(al.name) AS name, max(al.artist_name) AS subtitle, max(al.image_url) AS cover, ${totals}
              FROM plays p JOIN tracks t ON t.uri = p.uri JOIN albums al ON al.id = t.album_id
              WHERE ${range} GROUP BY al.id`;

  const res = await db().execute(sql`${query} ORDER BY ${order}, key LIMIT ${q.limit}`);
  return rowsOf<Omit<ChartItem, "href">>(res).map((r) => ({
    ...r,
    name: r.name ?? "Unknown",
    subtitle: r.subtitle ?? "",
    href:
      q.kind === "artist"
        ? artistHref(r.key)
        : q.kind === "track"
          ? trackHref(r.key)
          : albumHref(r.key),
  }));
}

/**
 * Top list over a preset range, cached per day and TIMEZONE until the next
 * sync: anonymous readers (the public page, share cards) must not trigger a
 * full-history scan on every request.
 */
export function cachedTop(kind: "artist" | "track", range: ChartRange, limit: number): Promise<ChartItem[]> {
  return unstable_cache(
    () => {
      const w = chartRange(range);
      return topItems({ kind, from: w?.from ?? null, to: w?.to ?? null, sort: "time", limit });
    },
    ["top", kind, range, String(limit), timezone(), localDateKey()],
    { tags: ["spotify"] }
  )();
}
