import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { addDaysKey } from "@/lib/time";

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: vi.fn() }));
const { eraDetail } = await import("./era-detail");

let d: Awaited<ReturnType<typeof useTestDb>>;
const play = (day: string, artist: string, uri: string, minutes = 4, slot = 0) => ({
  playedAt: new Date(Date.parse(`${day}T08:00:00Z`) + slot * 5 * 60_000),
  msPlayed: minutes * 60_000, kind: "track", uri, trackName: `T-${uri}`, artistName: artist, source: "export",
});

/** 5 weeks of A (Jan) then 5 of B (Feb), 2 hours a week. */
async function seed() {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const day = addDaysKey("2026-01-05", 7 * i);
    for (let k = 0; k < 30; k++) rows.push(play(day, i < 5 ? "A" : "B", i < 5 ? `a${k % 14}` : `b${k % 3}`, 4, k));
  }
  rows.push(play("2025-12-01", "A", "a0")); // a0 first heard before the era
  await d.insert(schema.plays).values(rows);
}

describe("eraDetail", () => {
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(async () => {
    await resetDb();
    await seed();
  });

  it("gives the era's top 12 tracks from inside its range only", async () => {
    const detail = await eraDetail("2026-01-05");
    expect(detail).not.toBeNull();
    expect(detail!.tracks).toHaveLength(12);
    expect(detail!.tracks.every((t) => t.artist === "A")).toBe(true);
  });

  it("counts tracks first heard during the era", async () => {
    const detail = await eraDetail("2026-01-05");
    expect(detail!.firstHeard).toBe(13); // a1..a13; a0 was heard in December
  });

  it("finds the era's biggest day", async () => {
    const detail = await eraDetail("2026-02-09");
    expect(detail!.topDay.minutes).toBe(120);
  });

  it("returns null for an unknown era", async () => {
    expect(await eraDetail("1999-01-04")).toBeNull();
  });
});
