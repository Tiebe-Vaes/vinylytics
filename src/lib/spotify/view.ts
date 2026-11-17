import { SpotifyAuthBroken, SpotifyNotConnected } from "./auth";
import { getSpotifyStatus, type SpotifyStatus } from "./client";
import { getLastPlayed, getNowPlaying } from "./now-playing";
import { sampleNowPlaying, musicSampleMode } from "./sample";
import type { NowPlaying } from "./types";

export type NowPlayingView = {
  demo: boolean;
  status: SpotifyStatus["state"];
  nowPlaying: NowPlaying | null;
  lastPlayed: NowPlaying | null;
};

/** Server-side first paint for the now-playing card; the client polls from here. */
export async function getNowPlayingView(): Promise<NowPlayingView> {
  if (musicSampleMode()) return { demo: true, status: "connected", nowPlaying: sampleNowPlaying, lastPlayed: null };

  const { state } = await getSpotifyStatus();
  if (state !== "connected") return { demo: false, status: state, nowPlaying: null, lastPlayed: null };
  const lastPlayed = await getLastPlayed().catch(() => null);
  try {
    return { demo: false, status: "connected", nowPlaying: await getNowPlaying(), lastPlayed };
  } catch (err) {
    if (err instanceof SpotifyAuthBroken) return { demo: false, status: "broken", nowPlaying: null, lastPlayed };
    if (err instanceof SpotifyNotConnected) return { demo: false, status: "not-connected", nowPlaying: null, lastPlayed };
    console.error("[now-playing view]", err);
    return { demo: false, status: "connected", nowPlaying: null, lastPlayed };
  }
}
