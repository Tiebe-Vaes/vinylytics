import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PlayRow } from "./types";

/** 1000 rows x 13 columns stays far under Postgres' 65535 bind-parameter cap. */
const BATCH = 1000;

/** Inserts plays, skipping ones already stored. Returns how many were new. */
export async function insertPlays(rows: PlayRow[]): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const inserted = await db()
      .insert(schema.plays)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoNothing()
      .returning({ id: schema.plays.id });
    written += inserted.length;
  }
  return written;
}

/**
 * One `ingest_runs` row per run. Chunks of one import share a `batchId` and
 * accumulate into a single row, like the health import does.
 */
export async function logRun(
  source: "api" | "export",
  r: { rowsSeen: number; rowsWritten: number; ok: boolean; error?: string; batchId?: string }
): Promise<void> {
  const d = db();
  const [existing] = r.batchId
    ? await d.select().from(schema.syncRuns).where(eq(schema.syncRuns.id, r.batchId)).limit(1)
    : [];

  const values = {
    finishedAt: new Date(),
    rowsSeen: (existing?.rowsSeen ?? 0) + r.rowsSeen,
    rowsWritten: (existing?.rowsWritten ?? 0) + r.rowsWritten,
    ok: r.ok && (existing?.ok ?? true),
    error: r.error ?? existing?.error ?? null,
  };

  if (existing) {
    await d.update(schema.syncRuns).set(values).where(eq(schema.syncRuns.id, existing.id));
  } else {
    await d.insert(schema.syncRuns).values({ ...(r.batchId ? { id: r.batchId } : {}), source, ...values });
  }
}
