import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, hasDb, schema } from "@/db";
import { demoAllowed } from "@/lib/env";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Who may sign in. OWNER_SPOTIFY_ID, when set, is the only account ever
 * allowed and overrides a stored owner. Without it the first account to
 * sign in claims the copy, and every other account is refused.
 */
export function decideOwner(p: {
  envOwner: string | null;
  storedOwner: string | null;
  incoming: string;
}): "claim" | "allow" | "deny" {
  if (p.envOwner) {
    if (p.incoming !== p.envOwner) return "deny";
    return p.storedOwner === p.incoming ? "allow" : "claim";
  }
  if (!p.storedOwner) return "claim";
  return p.incoming === p.storedOwner ? "allow" : "deny";
}

export async function storedOwner(): Promise<string | null> {
  if (!hasDb()) return null;
  const [row] = await db()
    .select({ id: schema.auth.spotifyUserId })
    .from(schema.auth)
    .where(eq(schema.auth.id, "owner"))
    .limit(1);
  return row?.id ?? null;
}

/** True for the signed-in owner, or always in local demo mode. */
export async function isOwner(): Promise<boolean> {
  if (demoAllowed()) return true;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const sub = verifySession(token, new Date(), process.env.AUTH_SECRET ?? "");
  if (!sub) return false;
  return sub === (await storedOwner());
}
