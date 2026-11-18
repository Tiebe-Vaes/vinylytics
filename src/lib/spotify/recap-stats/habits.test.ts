import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { plays } from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { longestSession, nightOwl, seasons } from "./habits";
import { play, year2026 } from "./test-helpers";

let d: Awaited<ReturnType<typeof useTestDb>>;
beforeAll(async () => { d = await useTestDb(); });
beforeEach(resetDb);
afterEach(() => vi.unstubAllEnvs());

it("has nothing to say about an empty year", async () => {
  expect(await nightOwl(d, year2026)).toBeNull();
  expect(await seasons(d, year2026)).toBeNull();
  expect(await longestSession(d, year2026)).toBeNull();
});

it("counts 00:00–04:59 local as night, so 23:59 is not and 00:01 is", async () => {
  vi.stubEnv("TIMEZONE", "Europe/Brussels");
  await d.insert(plays).values([play("2026-03-10T22:59:00Z", "late", 30), play("2026-03-10T23:01:00Z", "night", 10)]);
  const owl = await nightOwl(d, year2026);
  expect(owl!.share).toBeCloseTo(10 / 40, 5);
  expect(owl!.persona).toBe("Night owl");
});

it("calls a morning listener an early bird", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  await d.insert(plays).values([play("2026-03-10T06:00:00Z", "m", 30), play("2026-03-10T14:00:00Z", "d", 60)]);
  expect((await nightOwl(d, year2026))!.persona).toBe("Early bird");
});

it("gives summer and winter their own top artist and song", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  await d.insert(plays).values([
    play("2026-07-01T12:00:00Z", "sun", 30, "Sunny"), play("2026-07-02T12:00:00Z", "sun", 30, "Sunny"),
    play("2026-01-10T12:00:00Z", "snow", 20, "Frost"), play("2026-04-01T12:00:00Z", "spring", 90, "Spring"),
  ]);
  expect(await seasons(d, year2026)).toEqual({
    summer: { artist: "Sunny", track: "T-sun", minutes: 60 },
    winter: { artist: "Frost", track: "T-snow", minutes: 20 },
  });
});

it("breaks a session at a gap longer than 30 minutes", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  await d.insert(plays).values([
    play("2026-05-01T10:00:00Z", "a", 4), play("2026-05-01T10:05:00Z", "b", 4),
    play("2026-05-01T10:40:00Z", "c", 4), play("2026-05-01T10:45:00Z", "d", 4), play("2026-05-01T10:50:00Z", "e", 4),
  ]);
  expect(await longestSession(d, year2026)).toEqual({ start: "2026-05-01T10:40", minutes: 12, plays: 3 });
});
