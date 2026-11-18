import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { plays } from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { addDaysKey } from "@/lib/time";
import { crushes, goat, monthlyLeaders } from "./taste";
import { play, year2026 } from "./test-helpers";

let d: Awaited<ReturnType<typeof useTestDb>>;
beforeAll(async () => { d = await useTestDb(); });
beforeEach(resetDb);
afterEach(() => vi.unstubAllEnvs());

it("is empty without plays", async () => {
  expect(await goat(d)).toEqual({ artist: null, track: null });
  expect(await monthlyLeaders(d, year2026)).toEqual([]);
  expect(await crushes(d, year2026)).toEqual({ fastest: null, slowBurner: null, ghosted: [] });
});

it("crowns the all-time artist and song by minutes, across years", async () => {
  await d.insert(plays).values([play("2019-05-01T10:00:00Z", "old", 120, "Old Love"), play("2026-05-01T10:00:00Z", "new", 60, "New")]);
  const g = await goat(d);
  expect(g.artist).toEqual({ name: "Old Love", minutes: 120 });
  expect(g.track).toMatchObject({ name: "T-old", artist: "Old Love", minutes: 120 });
});

it("names each local month's leading artist", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  await d.insert(plays).values([
    play("2026-01-03T10:00:00Z", "a", 30, "Jan"), play("2026-01-04T10:00:00Z", "b", 10, "Other"),
    play("2026-02-03T10:00:00Z", "c", 30, "Feb"),
  ]);
  expect(await monthlyLeaders(d, year2026)).toEqual([
    { month: "2026-01", artist: "Jan", minutes: 30 }, { month: "2026-02", artist: "Feb", minutes: 30 },
  ]);
});

it("finds the fastest crush, the slow burner and artists you ghosted", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  const twenty = (uri: string, artist: string, start: string, everyDays: number) =>
    Array.from({ length: 20 }, (_, i) => play(`${addDaysKey(start, Math.floor(i * everyDays))}T${String(8 + (i % 10)).padStart(2, "0")}:00:00Z`, uri, 4, artist));
  await d.insert(plays).values([
    ...twenty("quick", "Quick", "2026-03-01", 0.1),
    ...twenty("slow", "Slow", "2026-03-01", 5),
    play("2026-01-10T10:00:00Z", "g", 320, "Gone"),
    play("2026-01-10T16:00:00Z", "l", 320, "Loyal"), play("2026-12-01T10:00:00Z", "l", 5, "Loyal"),
  ]);
  const c = await crushes(d, year2026);
  expect(c.fastest).toEqual({ track: "T-quick", artist: "Quick", days: 1 });
  expect(c.slowBurner).toEqual({ track: "T-slow", artist: "Slow", days: 95 });
  expect(c.ghosted).toEqual([{ artist: "Gone", lastPlay: "2026-01-10", minutesBefore: 320 }]);
});
