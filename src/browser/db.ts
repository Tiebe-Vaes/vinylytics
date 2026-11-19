"use client";

// Browser build only: stands in for `@/db` (see next.config.ts). The same
// drizzle API, backed by PGlite in IndexedDB, so the query modules run as-is.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { MIGRATIONS } from "./migrations.gen";

type Db = ReturnType<typeof drizzle<typeof schema>>;
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
    const d = drizzle(new PGlite("idb://vinylytics"), { schema });
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
    _db = d;
    return d;
  })();
  return opening;
}

export { schema };
