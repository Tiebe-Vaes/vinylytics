import { and, desc, eq, gte, lte } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db, schema } from "@/db";
import { SpotifyAuthBroken, SpotifyNotConnected } from "./auth";
import { spotifyFetch } from "./client";
import { insertPlays } from "./write";
import type { PlayRow, RecentlyPlayedItem, RecentlyPlayedResponse } from "./types";

/**
 * API plays carry no ms_played or skip data: count them as full plays and
 * leave skip fields null, so skip stats can stick to export rows.
 */
export function recentToPlays(items: RecentlyPlayedItem[]): PlayRow[] {
  return items.map(({ played_at, track }) => ({
    playedAt: new Date(played_at),
    msPlayed: track.duration_ms,
    kind: "track",
    uri: track.uri,
    trackName: track.name,
    artistName: track.artists[0]?.name ?? null,
    albumName: track.album.name,
    reasonStart: null,
    reasonEnd: null,
    skipped: null,
    shuffle: null,
    source: "api",
  }));
}

/**
 * The export's `ts` and the API's `played_at` mark the same play a few
 * seconds apart, so an exact-key match misses them. Drop a candidate when the
 * same track is already stored within the window.
 */
export function dropNearDuplicates(
  candidates: PlayRow[],
  existing: { uri: string | null; playedAt: Date }[],
  windowMs = 60_000
): PlayRow[] {
  return candidates.filter(
    (c) =>
      c.uri === null ||
      !existing.some(
        (e) => e.uri === c.uri && Math.abs(e.playedAt.getTime() - c.playedAt.getTime()) <= windowMs
      )
  );
}

export type SyncStatus = {
  http: 200 | 503;
  body: { skipped?: "not connected"; error?: "reconnect needed" };
};

/**
 * Not connected yet is normal (the workflow runs before setup), so it is a
 * quiet 200. A broken connection is a 503 so the GitHub workflow fails and
 * emails, instead of silently losing plays past the 50-play buffer.
 */
export function syncStatus(err: unknown): SyncStatus {
  if (err instanceof SpotifyNotConnected) return { http: 200, body: { skipped: "not connected" } };
  if (err instanceof SpotifyAuthBroken) return { http: 503, body: { error: "reconnect needed" } };
  throw err;
}

export async function syncRecentlyPlayed(): Promise<{ seen: number; written: number }> {
  const d = db();
  const [latest] = await d
    .select({ playedAt: schema.plays.playedAt })
    .from(schema.plays)
    .where(eq(schema.plays.source, "api"))
    .orderBy(desc(schema.plays.playedAt))
    .limit(1);

  const after = latest ? `&after=${latest.playedAt.getTime()}` : "";
  const res = await spotifyFetch<RecentlyPlayedResponse>(
    `/me/player/recently-played?limit=50${after}`,
    { cache: "no-store" }
  );
  const candidates = recentToPlays(res?.items ?? []);

  let written = 0;
  if (candidates.length > 0) {
    const times = candidates.map((c) => c.playedAt.getTime());
    const existing = await d
      .select({ uri: schema.plays.uri, playedAt: schema.plays.playedAt })
      .from(schema.plays)
      .where(
        and(
          gte(schema.plays.playedAt, new Date(Math.min(...times) - 60_000)),
          lte(schema.plays.playedAt, new Date(Math.max(...times) + 60_000))
        )
      );
    written = await insertPlays(dropNearDuplicates(candidates, existing));
  }

  await d
    .update(schema.auth)
    .set({ lastSyncAt: new Date() })
    .where(eq(schema.auth.id, "owner"));
  if (written > 0) revalidateTag("spotify", { expire: 0 });

  return { seen: candidates.length, written };
}
