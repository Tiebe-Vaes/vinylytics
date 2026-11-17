import { isOwner } from "@/lib/owner";
import { SpotifyAuthBroken, SpotifyNotConnected } from "@/lib/spotify/auth";
import { getNowPlaying } from "@/lib/spotify/now-playing";
import type { NowPlaying } from "@/lib/spotify/types";

export const dynamic = "force-dynamic";

export type NowPlayingPayload = {
  nowPlaying: NowPlaying | null;
  status: "ok" | "not-connected" | "broken";
};

/** Read-only, so GET is safe; still owner-only because it reveals listening. */
export async function GET() {
  if (!(await isOwner())) return Response.json({ error: "unauthorized" }, { status: 401 });

  const reply = (body: NowPlayingPayload) =>
    Response.json(body, { headers: { "Cache-Control": "no-store" } });

  try {
    return reply({ nowPlaying: await getNowPlaying(), status: "ok" });
  } catch (err) {
    if (err instanceof SpotifyNotConnected) return reply({ nowPlaying: null, status: "not-connected" });
    if (err instanceof SpotifyAuthBroken) return reply({ nowPlaying: null, status: "broken" });
    console.error("[now-playing]", err);
    return Response.json({ error: "Spotify request failed" }, { status: 502 });
  }
}
