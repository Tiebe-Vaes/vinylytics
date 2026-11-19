/** One staged import batch to the server. The browser build swaps this module
 * for src/browser/import-send.ts, which writes into the local database. */
export type BatchBody = { plays: unknown[]; batchId: string; offset: number; final: boolean };

export function sendBatch(body: BatchBody, signal: AbortSignal): Promise<Response | null> {
  return fetch("/api/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  }).catch(() => null);
}
