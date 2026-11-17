import { spotifyFetch } from "./client";
import { largestImage } from "./now-playing";
import type { SpotifyArtist, SpotifyTrack, TopItem } from "./types";

type Page<T> = { items: T[] };

/**
 * Spotify's own top lists. short_term is about 4 weeks and medium_term about
 * 6 months; long_term is only ~1 year, so all-time comes from our own plays.
 */
export async function getTopItems(type: "artists" | "tracks", term: "short_term" | "medium_term"): Promise<TopItem[]> {
  const init = { next: { revalidate: 3600, tags: ["spotify"] } };
  if (type === "artists") {
    const res = await spotifyFetch<Page<SpotifyArtist>>(`/me/top/artists?time_range=${term}&limit=20`, init);
    return (res?.items ?? []).map((a) => ({
      name: a.name,
      subtitle: "",
      imageUrl: largestImage(a.images),
      url: a.external_urls.spotify ?? null,
    }));
  }
  const res = await spotifyFetch<Page<SpotifyTrack>>(`/me/top/tracks?time_range=${term}&limit=20`, init);
  return (res?.items ?? []).map((t) => ({
    name: t.name,
    subtitle: t.artists.map((a) => a.name).join(", "),
    imageUrl: largestImage(t.album.images),
    url: t.external_urls.spotify ?? null,
  }));
}
