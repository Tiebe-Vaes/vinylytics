import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { enrichMissing } from "@/lib/spotify/enrich";
import { warmCaches } from "@/lib/spotify/warm";
import { z } from "zod";
import { isAuthorizedJob, serverError, unauthorized } from "@/lib/cron";
import { db, hasDb } from "@/db";
import { mergePlays } from "@/lib/spotify/merge";
import { logRun } from "@/lib/spotify/write";
import type { PlayRow } from "@/lib/spotify/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const text = z.string().max(1000).nullable();

const play = z.object({
  playedAt: z.iso.datetime({ offset: true }),
  msPlayed: z.number().int().min(0).max(86_400_000),
  kind: z.enum(["track", "episode", "audiobook"]),
  uri: z.string().max(200).nullable(),
  trackName: text,
  artistName: text,
  albumName: text,
  reasonStart: z.string().max(50).nullable(),
  reasonEnd: z.string().max(50).nullable(),
  skipped: z.boolean().nullable(),
  shuffle: z.boolean().nullable(),
  source: z.literal("export"),
});

const body = z.object({
  plays: z.array(play).min(1).max(1000),
  batchId: z.string().min(1).max(64),
  final: z.boolean().optional(),
});

/** One chunk of a browser-side export import. Chunks share a batchId. */
export async function POST(req: Request) {
  // isAuthorizedJob: bearer CRON_SECRET or the owner session (always true in dev:local).
  if (!(await isAuthorizedJob(req))) return unauthorized();
  if (!hasDb()) return Response.json({ error: "DATABASE_URL not set" }, { status: 503 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid body", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const { plays, batchId, final } = parsed.data;
  const rows: PlayRow[] = plays.map((p) => ({ ...p, playedAt: new Date(p.playedAt) }));

  try {
    // Folds plays the live sync already stored into their export twin.
    const written = await mergePlays(db(), rows);
    await logRun("export", { rowsSeen: rows.length, rowsWritten: written, ok: true, batchId });
    if (final) {
      revalidateTag("spotify", { expire: 0 });
      revalidateTag("insights", { expire: 0 }); // older history changes the long-range stats
      // Art and genres for the newly imported top items, then warm the slow views.
      after(() =>
        enrichMissing()
          .then(() => {
            revalidateTag("spotify", { expire: 0 });
            revalidateTag("insights", { expire: 0 });
          })
          .catch((err) => console.error("[spotify-enrich]", err))
          .then(warmCaches)
      );
    }
    return Response.json({ written });
  } catch (err) {
    const { message, detail } = serverError("ingest/spotify", err);
    await logRun("export", { rowsSeen: rows.length, rowsWritten: 0, ok: false, error: detail, batchId }).catch(() => {});
    return Response.json({ error: message }, { status: 500 });
  }
}
