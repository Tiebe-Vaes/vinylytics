import { and, gte, inArray, lte } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { PlayRow } from "./types";

/**
 * The live sync (api) and the export mark the same play up to a minute apart,
 * so the exact (played_at, uri) key misses them. Rules, per track uri:
 * - an export play replaces an api twin within the window: it carries the real
 *   ms_played and skip data;
 * - an api play is skipped when any twin (api or export) is already there;
 * - export plays never block each other here: a re-import hits the exact key,
 *   and two export plays 30 s apart are a real replay.
 */
export const TWIN_WINDOW_MS = 60_000;

export type StoredPlay = { id: string; uri: string | null; playedAt: Date; source: string };

const near = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) <= TWIN_WINDOW_MS;

export function planMerge(candidates: PlayRow[], existing: StoredPlay[]): { insert: PlayRow[]; deleteIds: string[] } {
  const exports = candidates.filter((c) => c.source === "export");
  const deleteIds = new Set<string>();
  const insert: PlayRow[] = [];

  for (const c of candidates) {
    if (c.uri === null) {
      insert.push(c);
      continue;
    }
    const twins = existing.filter((e) => e.uri === c.uri && near(e.playedAt, c.playedAt));
    if (c.source === "export") {
      for (const t of twins) if (t.source === "api") deleteIds.add(t.id);
      insert.push(c);
    } else {
      const exportInBatch = exports.some((e) => e.uri === c.uri && near(e.playedAt, c.playedAt));
      if (twins.length === 0 && !exportInBatch) insert.push(c);
    }
  }
  return { insert, deleteIds: [...deleteIds] };
}

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
const BATCH = 1000;

/** Inserts plays with twin handling. Returns how many rows were added net of replaced twins. */
export async function mergePlays(d: Db, rows: PlayRow[]): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const uris = [...new Set(chunk.map((r) => r.uri).filter((u): u is string => u !== null))];
    const times = chunk.map((r) => r.playedAt.getTime());
    const existing = uris.length
      ? await d
          .select({ id: schema.plays.id, uri: schema.plays.uri, playedAt: schema.plays.playedAt, source: schema.plays.source })
          .from(schema.plays)
          .where(
            and(
              inArray(schema.plays.uri, uris),
              gte(schema.plays.playedAt, new Date(Math.min(...times) - TWIN_WINDOW_MS)),
              lte(schema.plays.playedAt, new Date(Math.max(...times) + TWIN_WINDOW_MS))
            )
          )
      : [];

    const { insert, deleteIds } = planMerge(chunk, existing);
    // One transaction: a failed insert must not leave the api twin deleted.
    written += await d.transaction(async (tx) => {
      if (deleteIds.length) await tx.delete(schema.plays).where(inArray(schema.plays.id, deleteIds));
      const inserted = insert.length
        ? await tx.insert(schema.plays).values(insert).onConflictDoNothing().returning({ id: schema.plays.id })
        : [];
      return inserted.length - deleteIds.length;
    });
  }
  return written;
}
