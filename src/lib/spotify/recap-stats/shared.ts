import type { SQL } from "drizzle-orm";
import type { db } from "@/db";
import { rowsOf } from "@/db/rows";

/**
 * Recap stats take the database as an argument and use plain SQL, with no
 * caching inside, so the browser-only build can run them against PGlite.
 */
export type Db = ReturnType<typeof db>;
export type SeasonTop = { artist: string; track: string; minutes: number };

export async function rows<T>(d: Db, query: SQL): Promise<T[]> {
  return rowsOf<T>(await d.execute(query));
}
