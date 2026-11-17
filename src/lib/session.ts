import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The session is a signed cookie, no table: `base64url(payload).base64url(hmac)`.
 * One copy has one user, so there is nothing to revoke but the secret itself.
 */
export const SESSION_COOKIE = "session";
export const SESSION_DAYS = 30;

type Payload = { sub: string; exp: number };

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function signSession(spotifyUserId: string, now: Date, secret: string): string {
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const payload: Payload = { sub: spotifyUserId, exp: now.getTime() + SESSION_DAYS * 86_400_000 };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

/** The signed-in Spotify user id, or null. Never throws. */
export function verifySession(token: string | undefined, now: Date, secret: string): string | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;

  const given = Buffer.from(sig);
  const want = Buffer.from(sign(data, secret));
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as Partial<Payload>;
    if (typeof p.sub !== "string" || typeof p.exp !== "number" || p.exp <= now.getTime()) return null;
    return p.sub;
  } catch {
    return null;
  }
}
