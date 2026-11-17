import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rowsOf } from "@/db/rows";
import { hashInk, nearestInk, type InkId } from "@/lib/ink";
import { addDaysKey, localToUtc } from "@/lib/time";
import type { Era } from "./eras";
import { fetchCover } from "./cover-image";

const dayStart = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return localToUtc(y, m, d);
};

/**
 * An era's local days as a UTC instant range [from, to), so queries filter on
 * the indexed played_at instead of converting every play's timezone.
 */
export function eraInstants(era: Pick<Era, "start" | "end">): { from: Date; to: Date } {
  return { from: dayStart(era.start), to: dayStart(addDaysKey(era.end, 1)) };
}

/** Each era's cover: the art of its most-streamed track inside its date range (one query for all eras). */
export async function eraCovers(eras: Era[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>(eras.map((e) => [e.id, null]));
  if (eras.length === 0) return out;
  const ranges = sql.join(
    eras.map((e) => {
      const { from, to } = eraInstants(e);
      return sql`(${e.id}, ${from.toISOString()}::timestamptz, ${to.toISOString()}::timestamptz)`;
    }),
    sql`, `
  );
  const res = await db().execute(sql`
    WITH e(id, s, en) AS (VALUES ${ranges})
    SELECT DISTINCT ON (e.id) e.id, t.image_url AS cover
    FROM e
    JOIN plays p ON p.played_at >= e.s AND p.played_at < e.en
    JOIN tracks t ON t.uri = p.uri AND t.image_url IS NOT NULL
    WHERE p.kind = 'track' AND p.ms_played >= 30000
    GROUP BY e.id, t.uri, t.image_url
    ORDER BY e.id, count(*) DESC, t.uri`);
  for (const r of rowsOf<{ id: string; cover: string }>(res)) out.set(r.id, r.cover);
  return out;
}

/**
 * The cover's dominant colour as RGB, or null when the cover can't be read.
 * Covers only come from Spotify's API responses, never from user input.
 */
async function dominantColour(url: string): Promise<[number, number, number] | null> {
  try {
    const cover = await fetchCover(url);
    if (!cover) return null;
    const { default: sharp } = await import("sharp");
    const { dominant } = await sharp(cover.data, { limitInputPixels: 16_777_216 }).stats();
    return [dominant.r, dominant.g, dominant.b];
  } catch {
    return null;
  }
}

/** Successful samples only: a failed fetch is retried next time instead of pinning the fallback ink. */
const sampled = new Map<string, [number, number, number]>();

/** Ink for an era: the cover's dominant hue snapped to an ink, else a stable ink for the lead artist. */
export async function inkForCover(url: string | null, lead: string): Promise<InkId> {
  if (!url) return hashInk(lead);
  let rgb = sampled.get(url) ?? null;
  if (!rgb) {
    rgb = await dominantColour(url);
    if (rgb) sampled.set(url, rgb);
  }
  return (rgb && nearestInk(rgb)) ?? hashInk(lead);
}
