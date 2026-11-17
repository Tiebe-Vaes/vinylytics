import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { weeklyArtistMinutes } from "./eras-data";

type Db = Awaited<ReturnType<typeof useTestDb>>;
let d: Db;

const play = (at: string, artist: string | null, minutes = 3, kind = "track") => ({
  playedAt: new Date(at), msPlayed: minutes * 60_000, kind, uri: `spotify:track:${artist}`, artistName: artist, source: "export",
});

describe("weeklyArtistMinutes", () => {
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(resetDb);
  afterEach(() => {
    delete process.env.TIMEZONE;
  });

  it("sums minutes per Monday week and artist", async () => {
    await d.insert(schema.plays).values([
      play("2026-03-02T10:00:00Z", "A"), play("2026-03-03T10:00:00Z", "A"),
      play("2026-03-09T10:00:00Z", "A"), play("2026-03-16T10:00:00Z", "A"),
      play("2026-03-23T10:00:00Z", "B"), play("2026-03-30T10:00:00Z", "B"), play("2026-04-06T10:00:00Z", "B"),
    ]);
    const rows = await weeklyArtistMinutes();
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual({ week: "2026-03-02", artist: "A", minutes: 6 });
  });

  it("week buckets follow TIMEZONE", async () => {
    await d.insert(schema.plays).values([play("2026-03-01T22:30:00Z", "Sun"), play("2026-03-01T23:30:00Z", "Late")]);
    process.env.TIMEZONE = "Europe/Brussels";
    const bxl = await weeklyArtistMinutes();
    expect(bxl.find((r) => r.artist === "Sun")?.week).toBe("2026-02-23");
    expect(bxl.find((r) => r.artist === "Late")?.week).toBe("2026-03-02");
    delete process.env.TIMEZONE;
    const utc = await weeklyArtistMinutes();
    expect(utc.find((r) => r.artist === "Sun")?.week).toBe("2026-02-23");
    expect(utc.find((r) => r.artist === "Late")?.week).toBe("2026-02-23");
  });

  it("ignores episodes and plays without an artist", async () => {
    await d.insert(schema.plays).values([
      play("2026-03-02T10:00:00Z", "Pod", 30, "episode"),
      { ...play("2026-03-02T11:00:00Z", null), uri: null },
    ]);
    expect(await weeklyArtistMinutes()).toEqual([]);
  });
});
