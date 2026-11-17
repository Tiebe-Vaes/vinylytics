import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { hasDb } from "@/db";
import { isAuthorizedJob, serverError, unauthorized } from "@/lib/cron";
import { syncRecentlyPlayed, syncStatus } from "@/lib/spotify/sync";
import { logRun } from "@/lib/spotify/write";
import { enrichMissing } from "@/lib/spotify/enrich";
import { warmCaches } from "@/lib/spotify/warm";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Called every 30 min by .github/workflows/sync.yml (or the docker cron service). recently-played
 * only keeps the last 50 plays, so a slower cadence would lose history.
 */
export async function POST(req: Request) {
  if (!(await isAuthorizedJob(req))) return unauthorized();
  if (!hasDb()) return Response.json({ error: "DATABASE_URL not set" }, { status: 503 });

  try {
    const { seen, written } = await syncRecentlyPlayed();
    await logRun("api", { rowsSeen: seen, rowsWritten: written, ok: true });
    after(enrichAfter);
    return Response.json({ ok: true, seen, written });
  } catch (err) {
    try {
      const { http, body } = syncStatus(err);
      return Response.json(body, { status: http });
    } catch {
      const { message, detail } = serverError("cron/sync", err);
      await logRun("api", { rowsSeen: 0, rowsWritten: 0, ok: false, error: detail }).catch(() => {});
      return Response.json({ error: message }, { status: 500 });
    }
  }
}

/** Art and genres for whatever is still missing; never fails the sync. */
async function enrichAfter() {
  try {
    const n = await enrichMissing();
    if (n.tracks + n.artists > 0) revalidateTag("spotify", { expire: 0 });
  } catch (err) {
    console.error("[spotify-enrich]", err);
  }
  await warmCaches();
}
