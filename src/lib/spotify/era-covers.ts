import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rowsOf } from "@/db/rows";
import { hashInk, nearestInk, type InkId } from "@/lib/ink";
import type { Era } from "./eras";
import { local } from "./queries";

/** Each era's cover: the art of its most-streamed track inside its date range (one query for all eras). */
export async function eraCovers(eras: Era[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>(eras.map((e) => [e.id, null]));
  if (eras.length === 0) return out;
  const ranges = sql.join(
    eras.map((e) => sql`(${e.id}, ${e.start}::date, ${e.end}::date)`),
    sql`, `
  );
  const res = await db().execute(sql`
    WITH e(id, s, en) AS (VALUES ${ranges})
    SELECT DISTINCT ON (e.id) e.id, t.image_url AS cover
    FROM e
    JOIN plays p ON (${local()})::date BETWEEN e.s AND e.en
    JOIN tracks t ON t.uri = p.uri AND t.image_url IS NOT NULL
    WHERE p.kind = 'track' AND p.ms_played >= 30000
    GROUP BY e.id, t.uri, t.image_url
    ORDER BY e.id, count(*) DESC, t.uri`);
  for (const r of rowsOf<{ id: string; cover: string }>(res)) out.set(r.id, r.cover);
  return out;
}

/** The cover's dominant colour, snapped to an ink. Any failure falls back to a stable ink for the lead artist. */
async function sampleInk(url: string | null, lead: string): Promise<InkId> {
  if (!url) return hashInk(lead);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return hashInk(lead);
    const { default: sharp } = await import("sharp");
    const { dominant } = await sharp(Buffer.from(await res.arrayBuffer())).stats();
    return nearestInk([dominant.r, dominant.g, dominant.b]) ?? hashInk(lead);
  } catch {
    return hashInk(lead);
  }
}

/** Ink for an era, memoised per cover URL so the image is fetched once. */
export function inkForCover(url: string | null, lead: string): Promise<InkId> {
  if (!url) return Promise.resolve(hashInk(lead));
  return unstable_cache(() => sampleInk(url, lead), ["ink", url, lead])();
}
