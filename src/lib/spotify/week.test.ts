import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { weekSummary } from "./week";

let d: Awaited<ReturnType<typeof useTestDb>>;
const play = (day: string, artist: string, minutes: number) => ({
  playedAt: new Date(`${day}T12:00:00Z`), msPlayed: minutes * 60_000, kind: "track", uri: `u-${artist}`, artistName: artist, source: "api",
});

describe("weekSummary", () => {
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(resetDb);

  it("sums the last 7 local days and finds the top artist's share", async () => {
    await d.insert(schema.plays).values([
      play("2026-11-11", "A", 30), play("2026-11-15", "A", 30), play("2026-11-17", "B", 40),
      play("2026-11-10", "B", 500), // 8 days back: outside the week
    ]);
    const w = await weekSummary("2026-11-17");
    expect(w).toEqual({ minutes: 100, plays: 3, topArtist: "A", topArtistShare: 0.6 });
  });

  it("gives zeros on an empty db", async () => {
    expect(await weekSummary("2026-11-17")).toEqual({ minutes: 0, plays: 0, topArtist: null, topArtistShare: 0 });
  });

  it("keeps the exact share below the majority threshold", async () => {
    await d.insert(schema.plays).values([
      play("2026-11-17", "A", 49.6), play("2026-11-17", "B", 30), play("2026-11-17", "C", 20.4),
    ]);
    const w = await weekSummary("2026-11-17");
    expect(w.topArtistShare).toBeCloseTo(0.496, 6);
    expect(w.topArtistShare).toBeLessThan(0.5);
  });
});
