/**
 * `db().execute()` returns an array on postgres.js but `{ rows }` on PGlite
 * (dev:local). Raw queries read their rows through this so both work.
 */
export function rowsOf<T>(res: unknown): T[] {
  return (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as T[];
}
