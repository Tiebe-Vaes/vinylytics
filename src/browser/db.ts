"use client";

// Browser build only: stands in for `@/db` (see next.config.ts). The same
// drizzle API, backed by PGlite in IndexedDB, so the query modules run as-is.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { MIGRATIONS } from "./migrations.gen";

type Db = ReturnType<typeof drizzle<typeof schema>>;
const DATA_DIR = "idb://vinylytics";
/** PGlite names the IndexedDB database after the data dir. */
const IDB_NAME = "/pglite/vinylytics";
let client: PGlite | null = null;
let _db: Db | null = null;
let opening: Promise<Db> | null = null;

export function hasDb(): boolean {
  return true;
}

/** Throws until `openDb()` has resolved; pages call `useDb()` first. */
export function db(): Db {
  if (!_db) throw new Error("The browser database is not open yet.");
  return _db;
}

/** Opens (or creates) the history in this browser and applies new migrations. */
export function openDb(): Promise<Db> {
  opening ??= (async () => {
    client = new PGlite(DATA_DIR);
    const d = drizzle(client, { schema });
    await d.execute(sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY)`);
    const done = new Set(
      ((await d.execute(sql`SELECT name FROM _migrations`)).rows as { name: string }[]).map((r) => r.name)
    );
    for (const [name, body] of MIGRATIONS) {
      if (done.has(name)) continue;
      await d.transaction(async (tx) => {
        for (const stmt of body.split("--> statement-breakpoint")) {
          if (stmt.trim()) await tx.execute(sql.raw(stmt));
        }
        await tx.execute(sql`INSERT INTO _migrations (name) VALUES (${name})`);
      });
    }
    // PGlite runs no autovacuum, so tables start without statistics and the planner
    // picks nested loops that turn a 50 ms recap query into 40 s. Analyze once here.
    const [stats] = (await d.execute(sql`SELECT reltuples FROM pg_class WHERE relname = 'plays'`)).rows as { reltuples: number }[];
    if (!stats || stats.reltuples < 0) await d.execute(sql`ANALYZE`);
    _db = d;
    return d;
  })();
  return opening;
}

/** The whole database as one gzipped file, for the Settings backup button. */
export async function backupDb(): Promise<Blob> {
  await openDb();
  return client!.dumpDataDir("gzip");
}

function dropIndexedDb() {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(IDB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    // Another tab still has it open: it closes when that tab reloads.
    req.onblocked = () => resolve();
  });
}

async function closeDb() {
  await client?.close();
  client = null;
  _db = null;
  opening = null;
}

/** Deletes the history in this browser. The caller reloads the page. */
export async function deleteDb() {
  await closeDb();
  await dropIndexedDb();
}

/** Replaces the history in this browser with a backup file. The caller reloads the page. */
export async function restoreDb(file: Blob) {
  await closeDb();
  await dropIndexedDb();
  const restored = new PGlite(DATA_DIR, { loadDataDir: file });
  await restored.waitReady;
  await restored.close();
}

export { schema };
