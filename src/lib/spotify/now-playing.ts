import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { spotifyFetch } from "./client";
import type { CurrentlyPlayingResponse, NowPlaying, SpotifyImage } from "./types";

/** Spotify lists images in no promised order; take the widest. */
export function largestImage(images: SpotifyImage[]): string | null {
  let best: SpotifyImage | null = null;
  for (const img of images) if (!best || (img.width ?? 0) > (best.width ?? 0)) best = img;
  return best?.url ?? null;
}

/** Ads, private sessions and "nothing playing" all collapse to null. */
export function toNowPlaying(json: CurrentlyPlayingResponse | null): NowPlaying | null {
  const item = json?.item;
  if (!json || !item) return null;

  const common = {
    title: item.name,
    url: item.external_urls.spotify ?? null,
    progressMs: json.progress_ms ?? 0,
    durationMs: item.duration_ms,
    isPlaying: json.is_playing,
  };

  if (item.type === "episode") {
    return { kind: "episode", subtitle: item.show.name, imageUrl: largestImage(item.images), ...common };
  }
  return {
    kind: "track",
    subtitle: item.artists.map((a) => a.name).join(", "),
    imageUrl: largestImage(item.album.images),
    ...common,
  };
}

export async function getNowPlaying(): Promise<NowPlaying | null> {
  const json = await spotifyFetch<CurrentlyPlayingResponse>(
    "/me/player/currently-playing?additional_types=episode",
    { cache: "no-store" }
  );
  return toNowPlaying(json);
}

/** The newest stored play, shown as "Last played" when nothing is on. */
export async function getLastPlayed(): Promise<NowPlaying | null> {
  const [row] = await db()
    .select()
    .from(schema.plays)
    .orderBy(desc(schema.plays.playedAt))
    .limit(1);
  if (!row?.trackName) return null;
  const id = row.uri?.split(":")[2];
  const type = row.kind === "episode" ? "episode" : "track";
  return {
    kind: type,
    title: row.trackName,
    subtitle: row.artistName ?? "",
    imageUrl: null,
    url: id ? `https://open.spotify.com/${type}/${id}` : null,
    progressMs: 0,
    durationMs: row.msPlayed,
    isPlaying: false,
  };
}
