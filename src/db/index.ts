import { createRequire } from "node:module";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * Lazy so the app still boots (in demo mode) without DATABASE_URL set.
 * Anything that touches `db()` must first check `hasDb()`.
 */
type Db = ReturnType<typeof drizzle<typeof schema>>;
let _db: Db | null = null;

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — running in demo mode.");
  if (!_db) {
    // Static NODE_ENV check: production builds drop this branch and never bundle PGlite.
    _db =
      process.env.NODE_ENV !== "production" && url.startsWith("pglite:")
        ? localDb(url.slice("pglite:".length))
        : drizzle(
            // prepare:false works behind Neon's pooler; max:1 suits one serverless instance.
            postgres(url, { prepare: false, max: process.env.VERCEL ? 1 : 10 }),
            { schema }
          );
  }
  return _db;
}

/**
 * `npm run dev:local`: an in-process Postgres in a folder. Kept on globalThis
 * because hot reload re-runs this module, and two PGlite instances on one
 * folder corrupt it. Loaded at runtime so the bundler never traces PGlite.
 */
const LOCAL_PACKAGES = ["@electric-sql/pglite", "drizzle-orm/pglite"];

function localDb(dir: string): Db {
  const g = globalThis as { __pglite?: Db };
  if (!g.__pglite) {
    const load = createRequire(`${process.cwd()}/package.json`);
    const [pglite, orm] = LOCAL_PACKAGES.map((name) => load(name));
    g.__pglite = orm.drizzle(new pglite.PGlite(dir), { schema }) as Db;
  }
  return g.__pglite;
}

export { schema };
