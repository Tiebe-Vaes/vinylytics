import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db, hasDb, schema } from "@/db";
import { exchangeCode } from "@/lib/spotify/auth";
import { isProd } from "@/lib/env";
import { decideOwner, storedOwner } from "@/lib/owner";
import { SESSION_COOKIE, SESSION_DAYS, signSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const pending = z.object({ verifier: z.string().min(43), state: z.string().min(1) });
const me = z.object({ id: z.string().min(1) });

export async function GET(req: NextRequest) {
  const done = (path: string) => {
    const res = NextResponse.redirect(new URL(path, req.url));
    res.cookies.delete({ name: "spotify_oauth", path: "/api/auth" });
    return res;
  };

  const secret = process.env.AUTH_SECRET;
  if (!secret || !hasDb()) return done("/login?error=config");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  let saved: z.infer<typeof pending>;
  try {
    saved = pending.parse(JSON.parse(req.cookies.get("spotify_oauth")?.value ?? ""));
  } catch {
    return done("/login?error=failed");
  }
  if (!code || !state || state !== saved.state) return done("/login?error=failed");

  let userId: string;
  try {
    const t = await exchangeCode(code, saved.verifier);
    if (!t.refresh_token) return done("/login?error=failed");

    const profile = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${t.access_token}` },
    });
    if (!profile.ok) return done("/login?error=failed");
    userId = me.parse(await profile.json()).id;

    const verdict = decideOwner({
      envOwner: process.env.OWNER_SPOTIFY_ID || null,
      storedOwner: await storedOwner(),
      incoming: userId,
    });
    // Nothing is written for a refused account: no tokens, no row.
    if (verdict === "deny") return done("/login?error=not-owner");

    const row = {
      spotifyUserId: userId,
      refreshToken: t.refresh_token,
      accessToken: t.access_token,
      expiresAt: new Date(Date.now() + t.expires_in * 1000),
      scope: t.scope,
      broken: false,
    };
    await db()
      .insert(schema.auth)
      .values({ id: "owner", ...row })
      .onConflictDoUpdate({ target: schema.auth.id, set: row });
  } catch (err) {
    console.error("[auth-callback]", err);
    return done("/login?error=failed");
  }

  const res = done("/");
  res.cookies.set(SESSION_COOKIE, signSession(userId, new Date(), secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    maxAge: SESSION_DAYS * 86_400,
    path: "/",
  });
  return res;
}
