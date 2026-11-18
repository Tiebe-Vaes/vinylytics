import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { plays } from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { hourWeekdayGrid } from "./fingerprint";
import { vinylPhysics } from "./vinyl";
import { play, year2026 } from "./test-helpers";

it("turns minutes into turntable maths at 33⅓ rpm", () => {
  const v = vinylPhysics(4200);
  expect(v.rotations).toBe(140000);
  expect(v.recordsWorn).toBe(0);
  expect(v.grooveKm).toBeCloseTo((140000 * 2 * Math.PI * 0.11) / 1000, 6);
  expect(vinylPhysics(42_000).recordsWorn).toBe(1);
  expect(vinylPhysics(0)).toEqual({ rotations: 0, grooveKm: 0, recordsWorn: 0 });
});

let d: Awaited<ReturnType<typeof useTestDb>>;
beforeAll(async () => { d = await useTestDb(); });
beforeEach(resetDb);
afterEach(() => vi.unstubAllEnvs());

it("is an empty 7 × 24 grid without plays", async () => {
  const grid = await hourWeekdayGrid(d, year2026);
  expect(grid).toHaveLength(7);
  expect(grid.every((row) => row.length === 24 && row.every((v) => v === 0))).toBe(true);
});

it("buckets minutes by local weekday (Monday first) and hour", async () => {
  vi.stubEnv("TIMEZONE", "Europe/Brussels");
  // Monday 2 March 2026, 22:30Z = 23:30 local Monday; 23:30Z = 00:30 local Tuesday.
  await d.insert(plays).values([play("2026-03-02T22:30:00Z", "a", 10), play("2026-03-02T23:30:00Z", "b", 6)]);
  const grid = await hourWeekdayGrid(d, year2026);
  expect(grid[0][23]).toBe(10);
  expect(grid[1][0]).toBe(6);
});
