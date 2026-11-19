import { unstable_cache } from "next/cache";
import { asc, sql } from "drizzle-orm";
import { db, hasDb, schema } from "@/db";
import { rowsOf } from "@/db/rows";
import { timezone } from "@/lib/tz";
import type { InkId } from "@/lib/ink";
import { eraCovers, inkForCover } from "./era-covers";
import { detectEras, type Era, type EraOverride, type WeekArtist } from "./eras";
import { local } from "./queries";

/** Minutes per Monday week (in TIMEZONE) and artist, music only. */
export async function weeklyArtistMinutes(): Promise<WeekArtist[]> {
  const res = await db().execute(sql`
    SELECT to_char(date_trunc('week', ${local()}), 'YYYY-MM-DD') AS week,
           artist_name AS artist,
           (sum(ms_played) / 60000.0)::float AS minutes
    FROM plays
    WHERE kind = 'track' AND artist_name IS NOT NULL
    GROUP BY 1, 2 ORDER BY 1, 2`);
  return rowsOf<WeekArtist>(res);
}

export async function listOverrides(): Promise<EraOverride[]> {
  const rows = await db().select().from(schema.eraOverrides).orderBy(asc(schema.eraOverrides.createdAt));
  return rows.flatMap((r): EraOverride[] => {
    if (r.kind === "rename" && r.anchor && r.name) return [{ id: r.id, kind: "rename", anchor: r.anchor, name: r.name }];
    if (r.kind === "merge" && r.fromDay && r.toDay) return [{ id: r.id, kind: "merge", from: r.fromDay, to: r.toDay }];
    return [];
  });
}

/** An era as pages show it: pressed in an ink, with its lead cover as the sticker. */
export type EraView = Era & { ink: InkId; cover: string | null };
export type ErasData = { eras: EraView[]; overrides: (EraOverride & { unused: boolean })[] };

async function computeEras(): Promise<ErasData> {
  if (!hasDb()) return { eras: [], overrides: [] };
  const [rows, overrides] = await Promise.all([weeklyArtistMinutes(), listOverrides()]);
  const { eras, unusedOverrideIds } = detectEras(rows, overrides);
  const covers = await eraCovers(eras);
  const views = await Promise.all(
    eras.map(async (e) => {
      const cover = covers.get(e.id) ?? null;
      return { ...e, cover, ink: await inkForCover(cover, e.lead) };
    })
  );
  return { eras: views, overrides: overrides.map((o) => ({ ...o, unused: unusedOverrideIds.includes(o.id) })) };
}

/** Eras plus your overrides; cached until the next sync, import or override change. */
export function getEras(): Promise<ErasData> {
  return unstable_cache(computeEras, ["eras-v2", timezone()], { tags: ["spotify"] })();
}
