import { eq } from "drizzle-orm";
import { db, hasDb, schema } from "@/db";
import { refreshAccessToken, SpotifyAuthBroken, SpotifyNotConnected } from "./auth";

const API = "https://api.spotify.com/v1";
const OWNER = "owner";

/** Refresh a minute early so a token never expires mid-request. */
export function needsRefresh(expiresAt: Date | null, now: Date): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - now.getTime() < 60_000;
}

export async function isSpotifyConnected(): Promise<boolean> {
  if (!hasDb()) return false;
  const rows = await db()
    .select({ id: schema.auth.id })
    .from(schema.auth)
    .where(eq(schema.auth.id, OWNER))
    .limit(1);
  return rows.length > 0;
}

export async function getAccessToken(): Promise<string> {
  if (!hasDb()) throw new SpotifyNotConnected();
  const [row] = await db()
    .select()
    .from(schema.auth)
    .where(eq(schema.auth.id, OWNER))
    .limit(1);
  if (!row) throw new SpotifyNotConnected();
  if (row.broken) throw new SpotifyAuthBroken();

  const now = new Date();
  if (row.accessToken && !needsRefresh(row.expiresAt, now)) return row.accessToken;

  try {
    const t = await refreshAccessToken(row.refreshToken);
    await db()
      .update(schema.auth)
      .set({
        accessToken: t.access_token,
        expiresAt: new Date(now.getTime() + t.expires_in * 1000),
        scope: t.scope,
        // Spotify sometimes rotates the refresh token; keep the newest.
        ...(t.refresh_token ? { refreshToken: t.refresh_token } : {}),
      })
      .where(eq(schema.auth.id, OWNER));
    return t.access_token;
  } catch (err) {
    if (err instanceof SpotifyAuthBroken) {
      await db()
        .update(schema.auth)
        .set({ broken: true })
        .where(eq(schema.auth.id, OWNER));
    }
    throw err;
  }
}

type FetchInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };

/**
 * Typed GET/POST against the Web API. `null` on 204 (e.g. nothing playing).
 * A 429 waits out `Retry-After` once, capped at 10 s so a cron run can't
 * stall; a second 429 throws and the next run picks up where this one left.
 */
export async function spotifyFetch<T>(path: string, init: FetchInit = {}): Promise<T | null> {
  const token = await getAccessToken();
  const go = () =>
    fetch(`${API}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });

  let res = await go();
  if (res.status === 429) {
    const wait = Math.min(Number(res.headers.get("retry-after") ?? "1"), 10);
    await new Promise((r) => setTimeout(r, wait * 1000));
    res = await go();
  }

  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Spotify ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export type SpotifyStatus = {
  state: "not-connected" | "connected" | "broken";
  lastSyncAt: Date | null;
};

export async function getSpotifyStatus(): Promise<SpotifyStatus> {
  if (!hasDb()) return { state: "not-connected", lastSyncAt: null };
  const [row] = await db()
    .select({ broken: schema.auth.broken, lastSyncAt: schema.auth.lastSyncAt })
    .from(schema.auth)
    .where(eq(schema.auth.id, OWNER))
    .limit(1);
  if (!row) return { state: "not-connected", lastSyncAt: null };
  return { state: row.broken ? "broken" : "connected", lastSyncAt: row.lastSyncAt };
}
