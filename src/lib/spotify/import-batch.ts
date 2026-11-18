import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { mergePlays } from "./merge";
import type { PlayRow } from "./types";

export class ImportOrderError extends Error {}

/** rowsSeen is the durable cursor. A replay after a lost response returns the
 * original cumulative totals, even if two browser tabs replay the same batch.
 * `finished` is true only for the call that closed the run, so a replayed final
 * batch does not start enrichment again. */
export async function saveImportBatch(id: string, offset: number, rows: PlayRow[], final: boolean) {
  return db().transaction(async (tx) => {
    await tx.insert(schema.syncRuns).values({ id, source: "export" }).onConflictDoNothing();
    const [run] = await tx.select().from(schema.syncRuns).where(eq(schema.syncRuns.id, id)).for("update");
    if (run.source !== "export" || offset > run.rowsSeen) throw new ImportOrderError();
    if (offset < run.rowsSeen) {
      if (offset + rows.length > run.rowsSeen) throw new ImportOrderError();
      return { saved: run.rowsSeen, written: run.rowsWritten, finished: false };
    }
    if (run.finishedAt) throw new ImportOrderError();
    const written = run.rowsWritten + await mergePlays(tx, rows);
    const saved = offset + rows.length;
    await tx.update(schema.syncRuns).set({
      rowsWritten: written, rowsSeen: saved, finishedAt: final ? new Date() : null, ok: final,
    }).where(eq(schema.syncRuns.id, id));
    return { saved, written, finished: final };
  });
}
