import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { getItemStats } from "./item-stats";

let d: Awaited<ReturnType<typeof useTestDb>>;
const play = (at: string, artist: string, uri: string, minutes: number) => ({
  playedAt: new Date(at), msPlayed: Math.round(minutes * 60_000), kind: "track", uri, artistName: artist, source: "export",
});

describe("getItemStats", () => {
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(async () => {
    await resetDb();
    await d.insert(schema.plays).values([
      play("2025-12-31T10:00:00Z", "X", "x1", 0.1), // 6 s: not a stream
      play("2026-01-05T10:00:00Z", "X", "x1", 25), play("2026-01-06T10:00:00Z", "X", "x2", 25),
      play("2026-01-20T10:00:00Z", "X", "x1", 10),
      play("2026-02-10T10:00:00Z", "X", "x1", 20),
      play("2026-03-10T10:00:00Z", "X", "x2", 60),
      play("2026-01-10T10:00:00Z", "Y", "y1", 30), play("2026-02-10T11:00:00Z", "Y", "y1", 40), play("2026-03-10T11:00:00Z", "Y", "y1", 30),
    ]);
    await d.insert(schema.tracks).values([
      { uri: "x1", name: "X1", albumId: "alX" }, { uri: "x2", name: "X2", albumId: "alX" }, { uri: "y1", name: "Y1", albumId: "alY" },
    ]);
  });

  it("gives an artist's totals, first play, peak week and rank per month", async () => {
    const s = await getItemStats({ kind: "artist", name: "X" });
    expect(s.streams).toBe(5);
    expect(s.minutes).toBeCloseTo(140.1, 1);
    expect(s.firstPlay).toBe("2026-01-05T10:00:00.000Z");
    expect(s.lastPlay).toBe("2026-03-10T10:00:00.000Z");
    expect(s.peakWeek).toEqual({ week: "2026-03-09", minutes: 60 });
    expect(s.rankByMonth).toEqual([
      { month: "2025-12", rank: 1 }, { month: "2026-01", rank: 1 }, { month: "2026-02", rank: 2 }, { month: "2026-03", rank: 1 },
    ]);
    expect(s.allTimeRank).toBe(1);
    expect(s.weekly.map((w) => w.week)).toEqual(["2025-12-29", "2026-01-05", "2026-01-19", "2026-02-09", "2026-03-09"]);
  });

  it("gives a track the totals of its own plays", async () => {
    const s = await getItemStats({ kind: "track", uri: "y1" });
    expect([s.streams, s.minutes]).toEqual([3, 100]);
    expect(s.allTimeRank).toBe(1);
  });

  it("gives an album the totals of its tracks' plays", async () => {
    const album = await getItemStats({ kind: "album", albumId: "alX" });
    const artist = await getItemStats({ kind: "artist", name: "X" });
    expect([album.streams, album.minutes]).toEqual([artist.streams, artist.minutes]);
  });

  it("gives an unknown item zeros and empty lists", async () => {
    expect(await getItemStats({ kind: "artist", name: "Nobody" })).toEqual({
      firstPlay: null, lastPlay: null, minutes: 0, streams: 0, peakWeek: null, weekly: [], rankByMonth: [], allTimeRank: null,
    });
  });
});
