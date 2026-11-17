/**
 * Job routes are public URLs, so they authenticate on a shared secret sent by
 * GitHub Actions. A signed-in owner session is also accepted so the buttons on
 * /settings can trigger the same jobs by hand.
 */
import { timingSafeEqual } from "node:crypto";
import { originAllowed } from "@/lib/env";
import { isOwner } from "@/lib/owner";

export async function isAuthorizedJob(req: Request): Promise<boolean> {
  if (!originAllowed(req)) return false;

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization");
    if (header === `Bearer ${secret}`) return true;
  }

  return isOwner();
}

/**
 * Strict bearer check — no `isOwner()` fallback, so this is safe to accept on
 * GET. `isAuthorizedJob`'s routes are POST-only because a GET a signed-in
 * owner clicked could fire a job (SameSite=Lax cookies still ride top-level
 * navigations); a bearer token can never ride a browser navigation, so that
 * risk doesn't apply here. Timing-safe so an external caller with the wrong
 * token can't learn anything from response latency.
 */
export function isBearerAuthorized(
  req: Request,
  secret: string | undefined
): boolean {
  if (!secret) return false;

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const given = Buffer.from(header.slice(7));
  const want = Buffer.from(secret);
  if (given.length !== want.length) return false;
  return timingSafeEqual(given, want);
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

/**
 * Never hand raw error text to the client — it can echo connection strings and
 * token fragments. The detail goes to the server log and to `ingest_runs`,
 * which only the owner can read.
 */
export function serverError(context: string, err: unknown) {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[${context}]`, err);
  return { message: "Job failed. See Settings for details.", detail };
}
