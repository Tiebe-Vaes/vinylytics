import type { TokenResponse } from "./types";

/**
 * Spotify OAuth: Authorization Code + PKCE, with the client secret kept
 * server-side. Pure apart from `fetch`, so it can be tested without a DB.
 */

export const SPOTIFY_SCOPES =
  "user-top-read user-read-recently-played user-read-currently-playing user-library-read playlist-read-private";

/** No `owner` row yet: Spotify was never connected. */
export class SpotifyNotConnected extends Error {
  constructor() {
    super("Spotify is not connected");
    this.name = "SpotifyNotConnected";
  }
}

/** Spotify rejected the refresh token; the owner has to reconnect. */
export class SpotifyAuthBroken extends Error {
  constructor() {
    super("Spotify connection needs a reconnect");
    this.name = "SpotifyAuthBroken";
  }
}

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  // 64 random bytes -> 86 base64url chars, inside RFC 7636's 43..128.
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

export function buildAuthorizeUrl(p: {
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
}): string {
  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    client_id: p.clientId,
    response_type: "code",
    redirect_uri: p.redirectUri,
    code_challenge_method: "S256",
    code_challenge: p.challenge,
    state: p.state,
    scope: SPOTIFY_SCOPES,
  }).toString();
  return url.toString();
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    if (res.status === 400 && err?.error === "invalid_grant") throw new SpotifyAuthBroken();
    throw new Error(`Spotify token request failed: ${res.status} ${err?.error ?? ""}`.trim());
  }
  return (await res.json()) as TokenResponse;
}

export function exchangeCode(code: string, verifier: string): Promise<TokenResponse> {
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!redirectUri) throw new Error("SPOTIFY_REDIRECT_URI not set");
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
}

export function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}
