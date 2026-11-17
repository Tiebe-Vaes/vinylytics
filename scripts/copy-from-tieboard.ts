// One-off: copy your listening history from Tieboard's database into this one.
// Reads Tieboard only (spotify_plays, spotify_tracks, spotify_artists; never
// tokens) and is safe to re-run: rows that already exist are skipped.
//
//   TIEBOARD_DATABASE_URL=... DATABASE_URL=... npx tsx scripts/copy-from-tieboard.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { copyAll } from "../src/lib/spotify/copy";

const from = process.env.TIEBOARD_DATABASE_URL;
const to = process.env.DATABASE_URL;
if (!from || !to) {
  console.error("Set TIEBOARD_DATABASE_URL (source) and DATABASE_URL (this app).");
  process.exit(1);
}
if (from === to) {
  console.error("Source and destination are the same database.");
  process.exit(1);
}

const src = postgres(from, { max: 1, prepare: false });
const dest = postgres(to, { max: 1, prepare: false });
try {
  // Belt and braces: copyAll only SELECTs from the source; this also marks the
  // session read-only (a transaction-mode pooler may drop it, hence "also").
  await src`SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`;
  const n = await copyAll(
    (text, params) => src.unsafe(text, params as never[]) as Promise<Record<string, unknown>[]>,
    drizzle(dest, { schema })
  );
  console.log(`copied ${n.plays} plays, ${n.tracks} tracks, ${n.artists} artists (existing rows skipped)`);
} finally {
  await src.end();
  await dest.end();
}
