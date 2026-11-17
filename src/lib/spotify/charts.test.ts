import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { topItems } from "./charts";

let d: Awaited<ReturnType<typeof useTestDb>>;
let n = 0;
const play = (day: string, artist: string, uri: string, minutes: number) => ({
  playedAt: new Date(Date.parse(`${day}T08:00:00Z`) + n++ * 60_000),
  msPlayed: minutes * 60_000, kind: "track", uri, trackName: `T-${uri}`, artistName: artist, source: "export",
});

describe("topItems", () => {
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(async () => {
    await resetDb();
    // A: 3 short plays (more plays, fewer minutes). B: 1 long play.
    await d.insert(schema.plays).values([
      play("2026-03-01", "A", "a1", 1), play("2026-03-02", "A", "a1", 1), play("2026-03-03", "A", "a2", 1),
      play("2026-03-04", "B", "b1", 10),
      play("2025-01-01", "C", "c1", 60), // outside March
    ]);
    await d.insert(schema.albums).values([{ id: "alA", name: "Album A", artistName: "A", totalTracks: 10 }]);
    await d.insert(schema.tracks).values([
      { uri: "a1", name: "A1", albumId: "alA" }, { uri: "a2", name: "A2", albumId: "alA" }, { uri: "b1", name: "B1" },
    ]);
  });

  const march = { from: new Date("2026-03-01T00:00:00Z"), to: new Date("2026-04-01T00:00:00Z") };

  it("ranks artists by time or by plays", async () => {
    expect((await topItems({ kind: "artist", ...march, sort: "time", limit: 5 })).map((i) => i.name)).toEqual(["B", "A"]);
    expect((await topItems({ kind: "artist", ...march, sort: "plays", limit: 5 })).map((i) => i.name)).toEqual(["A", "B"]);
  });

  it("ranks tracks with their artist as subtitle and a deep-dive link", async () => {
    const [top] = await topItems({ kind: "track", ...march, sort: "plays", limit: 1 });
    expect(top).toMatchObject({ name: "T-a1", subtitle: "A", streams: 2, href: "/track/a1" });
  });

  it("ranks albums through the tracks they contain", async () => {
    const albums = await topItems({ kind: "album", ...march, sort: "plays", limit: 5 });
    expect(albums).toEqual([expect.objectContaining({ name: "Album A", subtitle: "A", streams: 3, href: "/album/alA" })]);
  });

  it("covers all time when the range is open", async () => {
    const all = await topItems({ kind: "artist", from: null, to: null, sort: "time", limit: 5 });
    expect(all[0].name).toBe("C");
  });
});
