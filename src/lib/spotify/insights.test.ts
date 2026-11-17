import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { addDaysKey } from "@/lib/time";
import { getInsights } from "./insights";

const TODAY = "2026-11-17";
let d: Awaited<ReturnType<typeof useTestDb>>;

const play = (day: string, artist: string, uri: string, track = uri, minutes = 3, hour = 12) => ({
  playedAt: new Date(`${day}T${String(hour).padStart(2, "0")}:00:00Z`), msPlayed: minutes * 60_000, kind: "track",
  uri, trackName: track, artistName: artist, source: "export",
});
/** n streams of one track on consecutive days from `from`. */
const run = (from: string, n: number, artist: string, uri: string) =>
  Array.from({ length: n }, (_, i) => play(addDaysKey(from, i), artist, uri));

describe("getInsights", () => {
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(resetDb);

  it("empty db returns empty insights", async () => {
    const i = await getInsights(TODAY);
    for (const v of [i.bSides, i.reissues, i.newVsFamiliar, i.loyalty.stayers, i.loyalty.oneAndDone, i.onThisDay, i.albumCompletion, i.artistStreaks]) {
      expect(v).toEqual([]);
    }
  });

  it("bSides: heavy once, silent for half a year", async () => {
    await d.insert(schema.plays).values([...run("2025-10-01", 25, "A", "b1"), ...run("2026-10-01", 25, "A", "b2"), ...run("2025-10-01", 10, "A", "b3")]);
    const { bSides } = await getInsights(TODAY);
    expect(bSides.map((b) => b.uri)).toEqual(["b1"]);
    expect(bSides[0]).toMatchObject({ name: "b1", artist: "A", streams: 25, lastPlay: "2025-10-25" });
  });

  it("reissues: back after a long gap", async () => {
    await d.insert(schema.plays).values([
      ...run("2025-01-10", 2, "A", "r1"), ...run("2025-09-01", 4, "A", "r1"),
      ...run("2025-01-10", 1, "A", "r2"), ...run("2025-09-01", 2, "A", "r2"),
    ]);
    const { reissues } = await getInsights(TODAY);
    expect(reissues).toEqual([{ uri: "r1", name: "r1", artist: "A", gapDays: 233, backOn: "2025-09-01", streamsAfter: 4 }]);
  });

  it("newVsFamiliar: new in the month a track is first streamed, familiar after", async () => {
    await d.insert(schema.plays).values([play("2026-03-05", "A", "n1", "n1", 5), play("2026-04-05", "A", "n1", "n1", 5)]);
    const { newVsFamiliar } = await getInsights(TODAY);
    expect(newVsFamiliar).toEqual([
      { month: "2026-03", newMinutes: 5, familiarMinutes: 0 },
      { month: "2026-04", newMinutes: 0, familiarMinutes: 5 },
    ]);
  });

  it("loyalty: stayers and one-and-done artists", async () => {
    const monthly = Array.from({ length: 12 }, (_, m) => play(`2025-${String(m + 1).padStart(2, "0")}-15`, "Stayer", "s1"));
    await d.insert(schema.plays).values([...monthly, ...run("2025-06-01", 12, "Fling", "f1")]);
    const { loyalty } = await getInsights(TODAY);
    expect(loyalty.stayers.map((s) => s.artist)).toEqual(["Stayer"]);
    expect(loyalty.stayers[0].activeMonthShare).toBeCloseTo(12 / 23, 2);
    expect(loyalty.oneAndDone).toEqual([{ artist: "Fling", streams: 12, firstPlay: "2025-06-01" }]);
  });

  it("onThisDay: the same day in earlier years, newest first", async () => {
    await d.insert(schema.plays).values([
      play("2025-11-17", "A", "t25"), play("2025-11-17", "A", "t25", "t25", 3, 13), play("2025-11-17", "B", "old", "old", 3, 14),
      play("2024-11-17", "C", "t24"), play("2024-11-10", "B", "old"),
    ]);
    const { onThisDay } = await getInsights(TODAY);
    expect(onThisDay.map((o) => o.year)).toEqual([2025, 2024]);
    expect(onThisDay[0].firstHeard).toEqual([{ name: "t25", artist: "A" }]);
    expect(onThisDay[0].topTrack).toEqual({ name: "t25", artist: "A", streams: 2 });
    expect(onThisDay[1].firstHeard).toEqual([{ name: "t24", artist: "C" }]);
  });

  it("albumCompletion: known track counts only, fullest first", async () => {
    await d.insert(schema.albums).values([
      { id: "full", name: "Full", artistName: "A", totalTracks: 4 },
      { id: "part", name: "Part", artistName: "A", totalTracks: 10 },
      { id: "unknown", name: "Unknown", artistName: "A", totalTracks: null },
      { id: "zero", name: "Zero", artistName: "A", totalTracks: 0 },
    ]);
    const tracks = [
      ...["f1", "f2", "f3", "f4"].map((uri) => ({ uri, albumId: "full" })),
      ...["p1", "p2", "p3"].map((uri) => ({ uri, albumId: "part" })),
      ...["u1", "u2", "u3"].map((uri) => ({ uri, albumId: "unknown" })),
      ...["z1", "z2", "z3"].map((uri) => ({ uri, albumId: "zero" })), // total_tracks 0 must not crash the page
    ];
    await d.insert(schema.tracks).values(tracks);
    await d.insert(schema.plays).values(tracks.map((t) => play("2026-05-01", "A", t.uri)));
    const { albumCompletion } = await getInsights(TODAY);
    expect(albumCompletion).toEqual([
      { albumId: "full", name: "Full", artist: "A", played: 4, total: 4 },
      { albumId: "part", name: "Part", artist: "A", played: 3, total: 10 },
    ]);
  });

  it("artistStreaks: longest run of consecutive days", async () => {
    await d.insert(schema.plays).values([...run("2026-03-01", 5, "K", "k1"), play("2026-03-07", "K", "k1")]);
    const { artistStreaks } = await getInsights(TODAY);
    expect(artistStreaks).toEqual([{ artist: "K", days: 5, from: "2026-03-01", to: "2026-03-05" }]);
  });
});
