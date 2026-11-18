import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { rowsOf } from "@/db/rows";
import type { ChartKind } from "./charts";

type Match = {kind: ChartKind; key: string; name: string; subtitle: string | null; cover: string | null};

export async function searchLibrary(query: string) {
  const term = query.trim().slice(0, 100);
  if (!term || !hasDb()) return [];
  // strpos treats %, _, and backslashes as ordinary characters.
  const matches = (field: ReturnType<typeof sql>) => sql`strpos(lower(${field}), lower(${term})) > 0`;
  const rows = rowsOf<Match>(await db().execute(sql`
    WITH library AS (
      SELECT 'artist' AS kind, p.artist_name AS key, p.artist_name AS name, null::text AS subtitle, max(a.image_url) AS cover
      FROM plays p LEFT JOIN artists a ON a.name = p.artist_name
      WHERE p.kind = 'track' AND ${matches(sql`p.artist_name`)} GROUP BY p.artist_name
      UNION ALL
      SELECT 'track', p.uri, max(coalesce(p.track_name,t.name)), max(coalesce(p.artist_name,t.artist_name)), max(t.image_url)
      FROM plays p LEFT JOIN tracks t ON t.uri = p.uri
      WHERE p.kind = 'track' AND p.uri IS NOT NULL AND ${matches(sql`coalesce(p.track_name,t.name)`)} GROUP BY p.uri
      UNION ALL
      SELECT 'album', a.id, a.name, a.artist_name, a.image_url FROM albums a
      WHERE ${matches(sql`a.name`)} AND EXISTS (SELECT 1 FROM tracks t JOIN plays p ON p.uri=t.uri WHERE p.kind='track' AND t.album_id=a.id)
    ), ranked AS (
      SELECT *, row_number() OVER (PARTITION BY kind ORDER BY (lower(name)=lower(${term})) DESC,
        strpos(lower(name),lower(${term})), lower(name), key) AS pos FROM library
    )
    SELECT kind, key, name, subtitle, cover FROM ranked WHERE pos <= 10 ORDER BY kind,pos`));
  return rows.map(row => ({
    ...row,
    href: `/${row.kind}/${encodeURIComponent(row.kind === "track" ? row.key.split(":").at(-1)! : row.key)}`,
  }));
}
