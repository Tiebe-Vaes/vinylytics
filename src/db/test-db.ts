// Test-only: an in-memory PGlite behind the real `db()`, with the committed
// migrations applied, so SQL is tested against the schema that ships.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "./index";

let ready: Promise<void> | null = null;

export async function useTestDb() {
  process.env.DATABASE_URL = "pglite:memory://";
  ready ??= (async () => {
    const dir = path.resolve(process.cwd(), "drizzle");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      for (const stmt of readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) {
        if (stmt.trim()) await db().execute(sql.raw(stmt));
      }
    }
  })();
  await ready;
  return db();
}

export async function resetDb() {
  await db().execute(sql`TRUNCATE plays, tracks, artists, albums, era_overrides, sync_runs, auth, settings`);
}
