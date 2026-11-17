import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { addDaysKey } from "@/lib/time";

vi.mock("@/lib/owner", () => ({ isOwner: vi.fn(async () => true) }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: () => unknown) => fn }));

const { renameEra, mergeWithNext, deleteOverride } = await import("./actions");
const { getEras } = await import("@/lib/spotify/eras-data");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

/** 5 weeks of A then 5 of B, 2 hours a week, from Monday 2026-01-05. */
async function seed(d: Awaited<ReturnType<typeof useTestDb>>) {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const day = addDaysKey("2026-01-05", 7 * i);
    rows.push({ playedAt: new Date(`${day}T12:00:00Z`), msPlayed: 120 * 60_000, kind: "track", uri: `u${i}`, artistName: i < 5 ? "A" : "B", source: "export" });
  }
  await d.insert(schema.plays).values(rows);
}

describe("era actions", () => {
  let d: Awaited<ReturnType<typeof useTestDb>>;
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(async () => {
    await resetDb();
    await seed(d);
  });

  it("renames an era, and a second rename replaces the first", async () => {
    const { eras } = await getEras();
    await renameEra(form({ eraId: eras[1].id, name: "  B season " }));
    await renameEra(form({ eraId: eras[1].id, name: "B forever" }));
    const after = await getEras();
    expect(after.eras[1].name).toBe("B forever");
    expect(await d.select().from(schema.eraOverrides)).toHaveLength(1);
  });

  it("merges an era with the next one, and removing the merge undoes it", async () => {
    const { eras } = await getEras();
    await mergeWithNext(form({ eraId: eras[0].id }));
    expect((await getEras()).eras).toHaveLength(1);
    const [o] = await d.select().from(schema.eraOverrides);
    expect([o.fromDay, o.toDay]).toEqual([eras[0].start, eras[1].end]);
    await deleteOverride(form({ id: o.id }));
    expect((await getEras()).eras).toHaveLength(2);
  });

  it("rejects an empty name and an unknown era", async () => {
    const { eras } = await getEras();
    await expect(renameEra(form({ eraId: eras[0].id, name: "   " }))).rejects.toThrow();
    await expect(renameEra(form({ eraId: "1999-01-04", name: "x" }))).rejects.toThrow();
  });
});
