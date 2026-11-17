import type { schema } from "@/db";
import { largestImage } from "./now-playing";
import type { SpotifyTrack } from "./types";

/** The album a track belongs to, as an albums row. Track lookups carry it, so no album endpoint is needed. */
export function albumFromTrack(t: SpotifyTrack): typeof schema.albums.$inferInsert {
  return {
    id: t.album.id,
    name: t.album.name,
    artistName: t.album.artists[0]?.name ?? null,
    imageUrl: largestImage(t.album.images),
    totalTracks: t.album.total_tracks,
    releaseDate: t.album.release_date,
  };
}
