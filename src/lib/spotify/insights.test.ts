import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { addDaysKey } from "@/lib/time";
import { getInsights } from "./insights";

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

  it("returns empty highlights for an empty library", async () => {
    expect(await getInsights()).toEqual({albumCompletion:[],artistStreaks:[]});
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
    const { albumCompletion } = await getInsights();
    expect(albumCompletion).toEqual([
      { albumId: "full", name: "Full", artist: "A", played: 4, total: 4 },
      { albumId: "part", name: "Part", artist: "A", played: 3, total: 10 },
    ]);
  });

  it("artistStreaks: longest run of consecutive days", async () => {
    await d.insert(schema.plays).values([...run("2026-03-01", 5, "K", "k1"), play("2026-03-07", "K", "k1")]);
    const { artistStreaks } = await getInsights();
    expect(artistStreaks).toEqual([{ artist: "K", days: 5, from: "2026-03-01", to: "2026-03-05" }]);
  });
});
