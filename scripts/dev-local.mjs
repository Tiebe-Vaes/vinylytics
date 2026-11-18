// Dev server on a local database with seed data and no sign-in. Nothing here
// touches a real database: DATABASE_URL is replaced by a PGlite folder
// (.data/pglite), a Postgres that runs inside the Node process.
//
//   npm run dev:local            start (applies the schema, seeds an empty db)
//   npm run dev:local -- --reset wipe the local db first
//   npm run dev:local -- --empty a separate db with no plays, to check empty states
//   npm run dev:local -- 3300    other port
//   npm run local                your own history: separate db, no seed, no sign-in, this computer only
//
// DEMO_MODE=1 turns sign-in off; src/lib/env.ts ignores it in production.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "../src/db/schema.ts";
import { seedPlays } from "./seed.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mine = process.argv.includes("--mine");
const empty = mine || process.argv.includes("--empty");
const name = mine ? "mine" : empty ? "empty" : "";
const dir = path.join(root, ".data", name ? `pglite-${name}` : "pglite");
const snapshotFile = path.join(root, ".data", name ? `schema-${name}.json` : "schema.json");
const args = process.argv.slice(2);
const port = args.find((a) => /^\d+$/.test(a)) || "3000";
// Resets only the chosen dev db, never your own history in .data/pglite-mine.
if (args.includes("--reset") && !mine) {
  rmSync(dir, { recursive: true, force: true });
  rmSync(snapshotFile, { force: true });
  // Next's data cache survives restarts and would keep serving the wiped db's results.
  rmSync(path.join(root, ".next", "dev", "cache", "fetch-cache"), { recursive: true, force: true });
}
mkdirSync(path.dirname(dir), { recursive: true });

const client = new PGlite(dir);
const db = drizzle(client, { schema });

// Schema changes: diff schema.ts against the snapshot saved last run. No
// introspection, because drizzle-kit's push fails on PGlite 0.5.
const prev = existsSync(snapshotFile) ? JSON.parse(readFileSync(snapshotFile, "utf8")) : generateDrizzleJson({});
const next = generateDrizzleJson(schema, prev.id);
let statements;
try {
  statements = await generateMigration(prev, next);
} catch (err) {
  console.error(`Can't migrate the local db (${err.message}). Run with --reset to start over.`);
  process.exit(1);
}
for (const sql of statements) await client.exec(sql);
writeFileSync(snapshotFile, JSON.stringify(next));
if (statements.length) console.log(`local db: ${statements.length} schema statement(s) applied`);

const seeded = empty ? 0 : await seedPlays(db, schema);
if (seeded) console.log(`local db: seeded ${seeded} plays`);
await client.close();

// Local mode has no sign-in, so it listens on this computer only.
const host = mine ? " -H 127.0.0.1" : "";
if (mine) console.log(`
Vinylytics: open http://127.0.0.1:${port} and choose Import history.
`);
const child = spawn(`npx next dev -p ${port}${host}`, {
  stdio: "inherit",
  shell: true,
  cwd: root,
  env: { ...process.env, DATABASE_URL: `pglite:${dir}`, ...(mine ? { VINYLYTICS_LOCAL: "1" } : { DEMO_MODE: "1" }) },
});
child.on("exit", (code) => process.exit(code ?? 0));
