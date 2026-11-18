import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { plays } from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { moodDays } from "./mood";
import { play, year2026 } from "./test-helpers";

let d: Awaited<ReturnType<typeof useTestDb>>;
beforeAll(async () => { d = await useTestDb(); });
beforeEach(resetDb);
afterEach(() => vi.unstubAllEnvs());
const slot = (day: string, i: number) => `${day}T${String(9 + Math.floor(i / 6)).padStart(2, "0")}:${String((i % 6) * 10).padStart(2, "0")}:00Z`;

it("has no mood days without plays", async () => {
  expect(await moodDays(d, year2026)).toEqual({ restless: null, comfort: null, spiral: null, euphoric: null });
});

it("names the restless day by its skip share, needing 15 flagged plays", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  await d.insert(plays).values([
    ...Array.from({ length: 15 }, (_, i) => play(slot("2026-04-01", i), `r${i}`, 4, "A", { skipped: i < 6 })),
    ...Array.from({ length: 10 }, (_, i) => play(slot("2026-04-02", i), `q${i}`, 4, "A", { skipped: true })),
  ]);
  expect((await moodDays(d, year2026)).restless).toEqual({ day: "2026-04-01", value: 0.4, detail: "40% of plays skipped" });
});

it("names the comfort day by old favourites, first heard a year or more before", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  await d.insert(plays).values([
    ...Array.from({ length: 8 }, (_, i) => play(slot("2024-06-01", i), `old${i}`)),
    ...Array.from({ length: 10 }, (_, i) => play(slot("2026-06-01", i), i < 8 ? `old${i}` : `new${i}`)),
  ]);
  expect((await moodDays(d, year2026)).comfort).toEqual({ day: "2026-06-01", value: 0.8, detail: "80% old favourites" });
});

it("puts a late-night spiral on the evening it started, across local midnight", async () => {
  vi.stubEnv("TIMEZONE", "Europe/Brussels");
  // 22:30Z/22:45Z are 23:30/23:45 on 1 Mar; 23:20Z is 00:20 on 2 Mar, still the same night.
  await d.insert(plays).values([play("2026-03-01T22:30:00Z", "u"), play("2026-03-01T22:45:00Z", "u"), play("2026-03-01T23:20:00Z", "u")]);
  expect((await moodDays(d, year2026)).spiral).toEqual({ day: "2026-03-01", value: 3, detail: "T-u ×3 after 23:00" });
});

it("names the euphoric day for new songs and long listening", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  await d.insert(plays).values([
    ...Array.from({ length: 12 }, (_, i) => play(slot("2026-05-05", i), `fresh${i}`, 15)),
    ...Array.from({ length: 3 }, (_, i) => play(slot("2026-05-06", i), `fresh${i}`, 15)),
  ]);
  expect((await moodDays(d, year2026)).euphoric).toEqual({ day: "2026-05-05", value: 12, detail: "12 new songs · 3 h 0 min" });
});
