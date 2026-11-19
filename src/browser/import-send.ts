// Browser build only: stands in for `@/lib/spotify/import-send`. Saves the
// batch into PGlite and answers like /api/import, so the runner is unchanged.
import { ImportOrderError, saveImportBatch } from "@/lib/spotify/import-batch";
import type { BatchBody } from "@/lib/spotify/import-send";
import type { PlayRow } from "@/lib/spotify/types";
import { openDb } from "./db";

type Wire = Omit<PlayRow, "playedAt"> & { playedAt: string };

export async function sendBatch(body: BatchBody): Promise<Response | null> {
  await openDb();
  const rows = (body.plays as Wire[]).map((p) => ({ ...p, playedAt: new Date(p.playedAt) })) as PlayRow[];
  try {
    const receipt = await saveImportBatch(body.batchId, body.offset, rows, body.final);
    return Response.json(receipt);
  } catch (err) {
    if (err instanceof ImportOrderError) return Response.json({ error: "Import cursor mismatch." }, { status: 409 });
    console.error("[browser-import]", err);
    return null;
  }
}
