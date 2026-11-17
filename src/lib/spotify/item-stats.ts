import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { rowsOf } from "@/db/rows";
import { local } from "./queries";

/** One artist, track or album: the numbers behind its deep-dive page. */

export type ItemRef =
  | { kind: "artist"; name: string }
  | { kind: "track"; uri: string }
  | { kind: "album"; albumId: string };

export type ItemStats = {
  firstPlay: string | null;
  lastPlay: string | null;
  minutes: number;
  streams: number;
  peakWeek: { week: string; minutes: number } | null;
  weekly: { week: string; minutes: number }[];
  rankByMonth: { month: string; rank: number }[];
  allTimeRank: number | null;
};

const STREAM = sql`ms_played >= 30000`;

/** Music plays with the grouping key for this kind of item. */
function base(ref: ItemRef): { from: SQL; value: string } {
  if (ref.kind === "album") {
    return {
      from: sql`(SELECT p.played_at, p.ms_played, t.album_id AS k FROM plays p JOIN tracks t ON t.uri = p.uri
                 WHERE p.kind = 'track' AND t.album_id IS NOT NULL) b`,
      value: ref.albumId,
    };
  }
  const col = ref.kind === "artist" ? sql`artist_name` : sql`uri`;
  return {
    from: sql`(SELECT played_at, ms_played, ${col} AS k FROM plays WHERE kind = 'track' AND ${col} IS NOT NULL) b`,
    value: ref.kind === "artist" ? ref.name : ref.uri,
  };
}

const iso = (v: unknown) => (v == null ? null : new Date(v as string | Date).toISOString());

export async function getItemStats(ref: ItemRef): Promise<ItemStats> {
  const { from, value } = base(ref);
  const d = db();

  const [totals, weekly, monthly, allTime] = await Promise.all([
    d.execute(sql`
      SELECT min(played_at) FILTER (WHERE ${STREAM}) AS first, max(played_at) FILTER (WHERE ${STREAM}) AS last,
             coalesce(sum(ms_played) / 60000.0, 0)::float AS minutes, count(*) FILTER (WHERE ${STREAM})::int AS streams
      FROM ${from} WHERE k = ${value}`),
    d.execute(sql`
      SELECT to_char(date_trunc('week', ${local()}), 'YYYY-MM-DD') AS week, (sum(ms_played) / 60000.0)::float AS minutes
      FROM ${from} WHERE k = ${value} GROUP BY 1 ORDER BY 1`),
    d.execute(sql`
      SELECT month, rank FROM (
        SELECT month, k, rank() OVER (PARTITION BY month ORDER BY ms DESC)::int AS rank
        FROM (SELECT to_char(${local()}, 'YYYY-MM') AS month, k, sum(ms_played) AS ms FROM ${from} GROUP BY 1, 2) m
      ) r WHERE k = ${value} ORDER BY month`),
    d.execute(sql`
      SELECT rank FROM (
        SELECT k, rank() OVER (ORDER BY sum(ms_played) DESC)::int AS rank FROM ${from} GROUP BY k
      ) r WHERE k = ${value}`),
  ]);

  const [t] = rowsOf<{ first: unknown; last: unknown; minutes: number; streams: number }>(totals);
  const weeks = rowsOf<{ week: string; minutes: number }>(weekly);
  const peak = weeks.reduce<{ week: string; minutes: number } | null>((best, w) => (!best || w.minutes > best.minutes ? w : best), null);

  return {
    firstPlay: iso(t?.first),
    lastPlay: iso(t?.last),
    minutes: t?.minutes ?? 0,
    streams: t?.streams ?? 0,
    peakWeek: peak,
    weekly: weeks,
    rankByMonth: rowsOf<{ month: string; rank: number }>(monthly),
    allTimeRank: rowsOf<{ rank: number }>(allTime)[0]?.rank ?? null,
  };
}
