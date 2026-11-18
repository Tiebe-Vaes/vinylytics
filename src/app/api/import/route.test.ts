import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { count, eq } from "drizzle-orm";
import { resetDb, useTestDb } from "@/db/test-db";
import * as schema from "@/db/schema";
import { db } from "@/db";
import { POST } from "./route";

const enrich = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/owner", () => ({ isOwner: async () => true }));
vi.mock("next/cache", () => ({ revalidateTag: () => {}, unstable_cache: (fn: () => unknown) => fn }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/spotify/enrich", () => ({ enrichMissing: enrich }));
vi.mock("@/lib/spotify/warm", () => ({ warmCaches: async () => {} }));

const play = (i: number) => ({
  playedAt: new Date(Date.UTC(2024, 0, 1, 0, i * 5)).toISOString(), msPlayed: 180_000, kind: "track",
  uri: `spotify:track:synthetic${i}`, trackName: `Synthetic ${i}`, artistName: "Test artist", albumName: null,
  reasonStart: null, reasonEnd: null, skipped: false, shuffle: null, source: "export",
});
const batch = (from: number, size: number) => Array.from({ length: size }, (_, i) => play(from + i));
const send = (body: object) => POST(new Request("http://test.local/api/import", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
}));
const plays = async () => (await db().select({ n: count() }).from(schema.plays))[0].n;

beforeAll(useTestDb);
beforeEach(async () => { await resetDb(); enrich.mockClear(); });

it("replays a batch whose response was lost without duplicates or inflated totals", async () => {
  const id = "synthetic-run";
  expect(await (await send({ plays: batch(0, 3), batchId: id, offset: 0 })).json()).toEqual({ saved: 3, written: 3, finished: false });
  // Response lost: the browser sends offset 0 again.
  expect(await (await send({ plays: batch(0, 3), batchId: id, offset: 0 })).json()).toEqual({ saved: 3, written: 3, finished: false });
  expect(await plays()).toBe(3);

  expect(await (await send({ plays: batch(3, 2), batchId: id, offset: 3, final: true })).json()).toEqual({ saved: 5, written: 5, finished: true });
  expect(enrich).toHaveBeenCalledTimes(1);
  // Lost final response: replay acknowledges and does not enrich again.
  expect(await (await send({ plays: batch(3, 2), batchId: id, offset: 3, final: true })).json()).toEqual({ saved: 5, written: 5, finished: false });
  expect(enrich).toHaveBeenCalledTimes(1);
  expect(await plays()).toBe(5);

  const [run] = await db().select().from(schema.syncRuns).where(eq(schema.syncRuns.id, id));
  expect(run).toMatchObject({ source: "export", rowsSeen: 5, rowsWritten: 5, ok: true });
  expect(run.finishedAt).not.toBeNull();
});

it("rejects a gap or overlapping offset and keeps the cursor after a failed middle batch", async () => {
  const id = "synthetic-gap";
  await send({ plays: batch(0, 2), batchId: id, offset: 0 });
  expect((await send({ plays: batch(4, 2), batchId: id, offset: 4 })).status).toBe(409);
  expect((await send({ plays: batch(1, 2), batchId: id, offset: 1 })).status).toBe(409);
  // A malformed middle batch fails validation and leaves nothing behind.
  expect((await send({ plays: [{ ...play(2), msPlayed: -1 }], batchId: id, offset: 2 })).status).toBe(400);
  expect(await (await send({ plays: batch(2, 2), batchId: id, offset: 2, final: true })).json()).toMatchObject({ saved: 4, written: 4 });
  expect(await plays()).toBe(4);
  // A finished run accepts no new rows.
  expect((await send({ plays: batch(4, 1), batchId: id, offset: 4 })).status).toBe(409);
});

it("keeps the legacy no-offset contract", async () => {
  expect(await (await send({ plays: batch(0, 2), batchId: "legacy", final: true })).json()).toEqual({ written: 2 });
  expect(await (await send({ plays: batch(0, 2), batchId: "legacy", final: true })).json()).toEqual({ written: 0 });
  expect(enrich).toHaveBeenCalledTimes(2);
});
