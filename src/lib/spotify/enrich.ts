import { rowsOf } from "@/db/rows";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { spotifyFetch } from "./client";
import { getTopTags, pickGenres } from "./lastfm";
import { albumFromTrack } from "./album";
import { largestImage } from "./now-playing";
import type { SpotifyArtist, SpotifyTrack } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fills the track and artist caches for the most-played items that have no
 * row yet. Single-item endpoints only: dev mode removed the batch ones. Capped
 * per run; each 30-min sync chips away at the backlog.
 */
export async function enrichMissing(limit = 50): Promise<{ tracks: number; artists: number; albums: number }> {
  const d = db();

  const tracks = await d.execute(sql`
    SELECT p.uri FROM plays p
    LEFT JOIN tracks t ON t.uri = p.uri
    WHERE t.uri IS NULL AND p.uri LIKE 'spotify:track:%'
    GROUP BY p.uri ORDER BY count(*) DESC LIMIT ${limit}`);

  let trackCount = 0;
  for (const { uri } of rowsOf<{ uri: string }>(tracks)) {
    const id = uri.split(":")[2];
    const t = await spotifyFetch<SpotifyTrack & { artists: { id: string; name: string }[] }>(`/tracks/${id}`).catch(
      () => null
    );
    if (t) await d.insert(schema.albums).values(albumFromTrack(t)).onConflictDoNothing();
    await d
      .insert(schema.tracks)
      .values({
        uri,
        name: t?.name ?? null,
        artistName: t?.artists[0]?.name ?? null,
        albumName: t?.album.name ?? null,
        imageUrl: t ? largestImage(t.album.images) : null,
        durationMs: t?.duration_ms ?? null,
        artistId: t?.artists[0]?.id ?? null,
        albumId: t?.album.id ?? null,
      })
      .onConflictDoNothing();
    trackCount++;
  }

  const artists = await d.execute(sql`
    SELECT p.artist_name AS name FROM plays p
    LEFT JOIN artists a ON a.name = p.artist_name
    WHERE a.name IS NULL AND p.kind = 'track' AND p.artist_name IS NOT NULL
    GROUP BY p.artist_name ORDER BY count(*) DESC LIMIT ${limit}`);

  let artistCount = 0;
  for (const { name } of rowsOf<{ name: string }>(artists)) {
    const [known] = await d
      .select({ artistId: schema.tracks.artistId })
      .from(schema.tracks)
      .where(sql`${schema.tracks.artistName} = ${name} AND ${schema.tracks.artistId} IS NOT NULL`)
      .limit(1);
    const a = known?.artistId
      ? await spotifyFetch<SpotifyArtist>(`/artists/${known.artistId}`).catch(() => null)
      : null;
    const tags = pickGenres(await getTopTags(name));
    await sleep(250); // Last.fm asks for a few requests per second at most.

    await d
      .insert(schema.artists)
      .values({ name, spotifyId: a?.id ?? null, imageUrl: a ? largestImage(a.images) : null, tags })
      .onConflictDoNothing();
    artistCount++;
  }

  // Tracks enriched before albums existed: fetch them again for their album.
  // A failed lookup (name null) is skipped, so it isn't retried every run.
  const stale = await d.execute(sql`
    SELECT uri FROM tracks WHERE album_id IS NULL AND name IS NOT NULL LIMIT ${limit}`);
  let albumCount = 0;
  for (const { uri } of rowsOf<{ uri: string }>(stale)) {
    const t = await spotifyFetch<SpotifyTrack>(`/tracks/${uri.split(":")[2]}`).catch(() => null);
    if (!t) continue;
    await d.insert(schema.albums).values(albumFromTrack(t)).onConflictDoNothing();
    await d.update(schema.tracks).set({ albumId: t.album.id }).where(sql`${schema.tracks.uri} = ${uri}`);
    albumCount++;
  }

  return { tracks: trackCount, artists: artistCount, albums: albumCount };
}

