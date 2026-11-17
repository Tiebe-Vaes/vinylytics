import { NextResponse, type NextRequest } from "next/server";
import { buildAuthorizeUrl, createPkcePair } from "@/lib/spotify/auth";
import { appUrl, secureCookies } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/** Starts Spotify OAuth. The PKCE verifier stays in an httpOnly cookie. */
export async function GET(req: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(appUrl("/login?error=config", process.env.SPOTIFY_REDIRECT_URI, req.url));
  }

  // Spotify calls back on the redirect URI's host; the OAuth cookie must be set there too.
  const home = appUrl("/api/auth/login", redirectUri, req.url);
  // Read the Host header: nextUrl rewrites 127.0.0.1 to localhost, which would loop.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && host !== home.host) return NextResponse.redirect(home);

  const { verifier, challenge } = await createPkcePair();
  const state = crypto.randomUUID();

  const res = NextResponse.redirect(buildAuthorizeUrl({ clientId, redirectUri, challenge, state }));
  res.cookies.set("spotify_oauth", JSON.stringify({ verifier, state }), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(redirectUri),
    maxAge: 600,
    path: "/api/auth",
  });
  return res;
}
