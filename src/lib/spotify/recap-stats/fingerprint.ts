import { sql } from "drizzle-orm";
import { local, rangeWhere } from "../queries";
import type { Range } from "../types";
import { rows, type Db } from "./shared";

/** Minutes per local weekday (Monday first) × hour: the shape of a listening week. */
export async function hourWeekdayGrid(d: Db, range: Range): Promise<number[][]> {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const list = await rows<{ dow: number; hour: number; minutes: number }>(d, sql`
    SELECT extract(isodow FROM ${local()})::int - 1 AS dow, extract(hour FROM ${local()})::int AS hour,
           round(sum(ms_played) / 60000.0)::int AS minutes
    FROM plays WHERE kind = 'track' AND ms_played > 0 AND ${rangeWhere(range)} GROUP BY 1, 2`);
  for (const r of list) grid[r.dow][r.hour] = r.minutes;
  return grid;
}
