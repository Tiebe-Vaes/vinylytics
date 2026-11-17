import { NextResponse, type NextRequest } from "next/server";
import { buildAuthorizeUrl, createPkcePair } from "@/lib/spotify/auth";
import { isProd } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Starts Spotify OAuth. The PKCE verifier stays in an httpOnly cookie. */
export async function GET(req: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL("/login?error=config", req.url));
  }

  const { verifier, challenge } = await createPkcePair();
  const state = crypto.randomUUID();

  const res = NextResponse.redirect(buildAuthorizeUrl({ clientId, redirectUri, challenge, state }));
  res.cookies.set("spotify_oauth", JSON.stringify({ verifier, state }), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    maxAge: 600,
    path: "/api/auth",
  });
  return res;
}
