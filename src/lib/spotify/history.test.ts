import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { historyDayPage, historyPage, listeningDays } from "./history";

let d: Awaited<ReturnType<typeof useTestDb>>;

describe("historyPage", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(async () => {
    await resetDb();
    await d.insert(schema.plays).values(
      Array.from({ length: 5 }, (_, i) => ({
        playedAt: new Date(Date.UTC(2026, 2, 1, 10, i)),
        msPlayed: i === 2 ? 5_000 : 180_000,
        kind: "track",
        uri: `spotify:track:t${i}`,
        trackName: `Track ${i}`,
        artistName: "A",
        skipped: i === 2,
        source: "export",
      }))
    );
  });

  it("lists plays newest first", async () => {
    const page = await historyPage(null, 3);
    expect(page.plays.map((p) => p.name)).toEqual(["Track 4", "Track 3", "Track 2"]);
    expect(page.plays[2].skipped).toBe(true);
  });

  it("pages on with the cursor and stops at the end", async () => {
    const first = await historyPage(null, 3);
    expect(first.next).not.toBeNull();
    const second = await historyPage(first.next, 3);
    expect(second.plays.map((p) => p.name)).toEqual(["Track 1", "Track 0"]);
    expect(second.next).toBeNull();
  });

  it("rejects a malformed cursor by starting from the top", async () => {
    expect((await historyPage("not-a-date", 3)).plays[0].name).toBe("Track 4");
  });

  it("keeps complete local days together across the DST change and drill-down pages", async () => {
    vi.stubEnv("TIMEZONE", "Europe/Brussels");
    const extra = ["2026-03-28T23:01Z", "2026-03-29T21:59Z", "2026-03-29T22:00Z"];
    await d.insert(schema.plays).values(extra.map((at, index) => ({
      playedAt: new Date(at), msPlayed: index === 1 ? 10000 : 180000,
      trackName: index === 1 ? "Skipped" : "Night song", artistName: "B",
      kind: "track", uri: "spotify:track:n" + index, source: "export",
    })));
    const first = await historyDayPage(null, 2);
    expect(first.days.map((v) => v.day)).toEqual(["2026-03-30", "2026-03-29"]);
    expect(first.next).toBe("2026-03-29");
    expect((await historyDayPage(first.next, 2)).days.map((v) => v.day)).toEqual(["2026-03-01"]);
    const [day] = await listeningDays("2026-03-29", "2026-03-29");
    expect(day).toMatchObject({ plays: 2, topArtist: "B", topTrack: "Night song" });
    expect(day.minutes).toBeCloseTo(190 / 60);
    const raw = await historyPage(null, 1, day.day);
    expect(raw.plays[0].name).toBe("Skipped");
    expect((await historyPage(raw.next, 1, day.day)).next).toBeNull();
    expect(await listeningDays("2026-02-31", "2026-03-01")).toEqual([]);
  });
});
