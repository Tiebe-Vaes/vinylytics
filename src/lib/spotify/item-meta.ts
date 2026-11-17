import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { rowsOf } from "@/db/rows";
import type { ItemRef } from "./item-stats";

export type ItemMeta = { title: string; subtitle: string; cover: string | null; spotifyUrl: string | null };

const open = (kind: "artist" | "track" | "album", id: string | null) => (id ? `https://open.spotify.com/${kind}/${id}` : null);

/** Name, cover and Spotify link for a deep-dive header; null when we've never seen the item. */
export async function itemMeta(ref: ItemRef): Promise<ItemMeta | null> {
  if (!hasDb()) return null;
  const d = db();

  if (ref.kind === "artist") {
    const [row] = rowsOf<{ name: string; image: string | null; id: string | null }>(
      await d.execute(sql`
        SELECT p.artist_name AS name, max(a.image_url) AS image, max(a.spotify_id) AS id
        FROM plays p LEFT JOIN artists a ON a.name = p.artist_name
        WHERE p.artist_name = ${ref.name} GROUP BY p.artist_name`)
    );
    return row ? { title: row.name, subtitle: "Artist", cover: row.image, spotifyUrl: open("artist", row.id) } : null;
  }

  if (ref.kind === "track") {
    const [row] = rowsOf<{ name: string | null; artist: string | null; image: string | null }>(
      await d.execute(sql`
        SELECT coalesce(max(t.name), max(p.track_name)) AS name, coalesce(max(t.artist_name), max(p.artist_name)) AS artist,
               max(t.image_url) AS image
        FROM plays p LEFT JOIN tracks t ON t.uri = p.uri
        WHERE p.uri = ${ref.uri} GROUP BY p.uri`)
    );
    if (!row) return null;
    return {
      title: row.name ?? "Unknown track",
      subtitle: row.artist ?? "",
      cover: row.image,
      spotifyUrl: open("track", ref.uri.split(":").at(-1) ?? null),
    };
  }

  const [row] = rowsOf<{ name: string | null; artist: string | null; image: string | null }>(
    await d.execute(sql`SELECT name, artist_name AS artist, image_url AS image FROM albums WHERE id = ${ref.albumId}`)
  );
  return row ? { title: row.name ?? "Unknown album", subtitle: row.artist ?? "", cover: row.image, spotifyUrl: open("album", ref.albumId) } : null;
}
