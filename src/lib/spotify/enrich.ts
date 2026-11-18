import { rowsOf } from "@/db/rows";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { spotifyFetch } from "./client";
import { getTopTags, pickGenres } from "./lastfm";
import { albumFromTrack } from "./album";
import { largestImage } from "./now-playing";
import type { SpotifyArtist, SpotifyTrack } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const retryDelay = 6 * 60 * 60 * 1000;
const paused = Symbol("Spotify lookup paused");

async function lookup<T>(path: string) {
  try {
    return await spotifyFetch<T>(path);
  } catch (error) {
    // The client already attempted a bounded Retry-After. Stop this run when
    // throttled instead of applying the same wait to each queued item.
    if (error instanceof Error && /failed: (401|403|429)$/.test(error.message)) return paused;
    return null;
  }
}

/**
 * Fill new metadata and revisit old rows with missing artwork. Separate caps
 * keep existing backfills moving even while a large import adds new tracks.
 */
export async function enrichMissing(limit = 50): Promise<{ tracks: number; artists: number; albums: number }> {
  const d = db();
  const retryBefore = new Date(Date.now() - retryDelay).toISOString();

  const tracks = await d.execute(sql`
    SELECT p.uri FROM plays p
    LEFT JOIN tracks t ON t.uri = p.uri
    WHERE t.uri IS NULL AND p.uri LIKE 'spotify:track:%'
    GROUP BY p.uri ORDER BY count(*) DESC LIMIT ${limit}`);

  let trackCount = 0;
  const stale = await d.execute(sql`
    SELECT t.uri FROM tracks t LEFT JOIN albums a ON a.id = t.album_id
    WHERE (t.image_url IS NULL OR a.image_url IS NULL) AND t.fetched_at < ${retryBefore}::timestamptz
      AND t.uri LIKE 'spotify:track:%'
    ORDER BY t.fetched_at, t.uri LIMIT ${limit}`);
  const fresh = rowsOf<{ uri: string }>(tracks).map((row) => ({ ...row, repair: false }));
  const repairs = rowsOf<{ uri: string }>(stale).map((row) => ({ ...row, repair: true }));
  let albumCount = 0;
  let artistCount = 0;
  const totals = () => ({ tracks: trackCount, artists: artistCount, albums: albumCount });
  for (const { uri, repair } of [...fresh, ...repairs]) {
    const id = uri.split(":")[2];
    const t = await lookup<SpotifyTrack>(`/tracks/${id}`);
    if (t === paused) return totals();
    if (t) {
      const album = albumFromTrack(t);
      await d.insert(schema.albums).values(album).onConflictDoUpdate({
        target: schema.albums.id,
        set: {
          name: sql`coalesce(${schema.albums.name}, excluded.name)`,
          artistName: sql`coalesce(${schema.albums.artistName}, excluded.artist_name)`,
          imageUrl: sql`coalesce(${schema.albums.imageUrl}, excluded.image_url)`,
          totalTracks: sql`coalesce(${schema.albums.totalTracks}, excluded.total_tracks)`,
          releaseDate: sql`coalesce(${schema.albums.releaseDate}, excluded.release_date)`,
        },
      });
    }
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
      .onConflictDoUpdate({
        target: schema.tracks.uri,
        set: {
          name: sql`coalesce(${schema.tracks.name}, excluded.name)`,
          artistName: sql`coalesce(${schema.tracks.artistName}, excluded.artist_name)`,
          albumName: sql`coalesce(${schema.tracks.albumName}, excluded.album_name)`,
          imageUrl: sql`coalesce(${schema.tracks.imageUrl}, excluded.image_url)`,
          durationMs: sql`coalesce(${schema.tracks.durationMs}, excluded.duration_ms)`,
          artistId: sql`coalesce(${schema.tracks.artistId}, excluded.artist_id)`,
          albumId: sql`coalesce(${schema.tracks.albumId}, excluded.album_id)`,
          fetchedAt: new Date(),
        },
      });
    if (t && repair) albumCount++;
    else if (!repair) trackCount++;
  }

  const artists = await d.execute(sql`
    SELECT p.artist_name AS name, a.name IS NULL AS fresh, a.spotify_id AS "spotifyId" FROM plays p
    LEFT JOIN artists a ON a.name = p.artist_name
    WHERE p.kind = 'track' AND p.artist_name IS NOT NULL AND (
      a.name IS NULL OR (a.image_url IS NULL AND (a.fetched_at < ${retryBefore}::timestamptz OR a.spotify_id IS NULL)
        AND (a.spotify_id IS NOT NULL OR EXISTS (SELECT 1 FROM tracks t WHERE t.artist_name = p.artist_name AND t.artist_id IS NOT NULL))
      )
    )
    GROUP BY p.artist_name, a.name, a.fetched_at, a.spotify_id
    ORDER BY a.fetched_at NULLS FIRST, count(*) DESC, p.artist_name LIMIT ${limit}`);

  for (const { name, fresh, spotifyId } of rowsOf<{ name: string; fresh: boolean; spotifyId: string | null }>(artists)) {
    let id = spotifyId;
    if (!id) {
      const [known] = await d.select({ artistId: schema.tracks.artistId }).from(schema.tracks)
        .where(sql`${schema.tracks.artistName} = ${name} AND ${schema.tracks.artistId} IS NOT NULL`)
        .limit(1);
      id = known?.artistId ?? null;
    }
    const a = id ? await lookup<SpotifyArtist>(`/artists/${id}`) : null;
    if (a === paused) return totals();
    const tags = fresh ? pickGenres(await getTopTags(name)) : [];
    if (fresh) await sleep(250);

    await d
      .insert(schema.artists)
      .values({ name, spotifyId: a?.id ?? id, imageUrl: a ? largestImage(a.images) : null, tags })
      .onConflictDoUpdate({
        target: schema.artists.name,
        set: {
          spotifyId: sql`coalesce(${schema.artists.spotifyId}, excluded.spotify_id)`,
          imageUrl: sql`coalesce(${schema.artists.imageUrl}, excluded.image_url)`,
          fetchedAt: new Date(),
        },
      });
    if (fresh || a) artistCount++;
  }

  return totals();
}

