import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  buildAuthorizeUrl,
  createPkcePair,
  refreshAccessToken,
  SpotifyAuthBroken,
  SPOTIFY_SCOPES,
} from "./auth";
import { needsRefresh } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("createPkcePair", () => {
  it("makes an RFC 7636 verifier and its S256 challenge", async () => {
    const { verifier, challenge } = await createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
    const want = createHash("sha256").update(verifier).digest("base64url");
    expect(challenge).toBe(want);
  });
});

describe("buildAuthorizeUrl", () => {
  it("carries every parameter Spotify needs", () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: "cid",
        redirectUri: "http://127.0.0.1:3000/api/spotify/callback",
        challenge: "ch",
        state: "st",
      })
    );
    expect(url.origin + url.pathname).toBe("https://accounts.spotify.com/authorize");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe("ch");
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("scope")).toBe(SPOTIFY_SCOPES);
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://127.0.0.1:3000/api/spotify/callback"
    );
  });
});

describe("needsRefresh", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  it("refreshes when unknown or within 60 s", () => {
    expect(needsRefresh(null, now)).toBe(true);
    expect(needsRefresh(new Date("2026-10-17T12:00:59Z"), now)).toBe(true);
    expect(needsRefresh(new Date("2026-10-17T12:01:01Z"), now)).toBe(false);
  });
});

describe("refreshAccessToken", () => {
  it("throws SpotifyAuthBroken on invalid_grant", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "cid");
    vi.stubEnv("SPOTIFY_CLIENT_SECRET", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }))
    );
    await expect(refreshAccessToken("rt")).rejects.toBeInstanceOf(SpotifyAuthBroken);
  });
});
