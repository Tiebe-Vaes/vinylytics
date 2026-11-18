import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { plays } from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { burnout, obsession, oneWeekWonders, repeatChampion } from "./obsessions";
import { play, year2026 } from "./test-helpers";

let d: Awaited<ReturnType<typeof useTestDb>>;
beforeAll(async () => { d = await useTestDb(); });
beforeEach(resetDb);
afterEach(() => vi.unstubAllEnvs());
const at = (day: string, i: number) => `${day}T${String(10 + Math.floor(i / 12)).padStart(2, "0")}:${String((i % 12) * 5).padStart(2, "0")}:00Z`;

it("is empty without plays", async () => {
  expect(await obsession(d, year2026)).toBeNull();
  expect(await repeatChampion(d, year2026)).toBeNull();
  expect(await burnout(d, year2026)).toEqual([]);
  expect(await oneWeekWonders(d, year2026)).toEqual([]);
});

it("finds the most plays of one song on one local day, splitting at local midnight", async () => {
  vi.stubEnv("TIMEZONE", "Europe/Brussels");
  // 22:30Z and 22:50Z are 23:30 and 23:50 on the 10th; 23:10Z is 00:10 on the 11th.
  await d.insert(plays).values([
    play("2026-03-10T22:30:00Z", "x"), play("2026-03-10T22:50:00Z", "x"), play("2026-03-10T23:10:00Z", "x"),
    play("2026-03-12T10:00:00Z", "y"),
  ]);
  expect(await obsession(d, year2026)).toEqual({ track: "T-x", artist: "A", day: "2026-03-10", plays: 2 });
});

it("counts the longest back-to-back run, broken by another song", async () => {
  await d.insert(plays).values(["a", "a", "b", "a", "a", "a", "c"].map((uri, i) => play(at("2026-04-01", i), uri)));
  expect(await repeatChampion(d, year2026)).toEqual({ track: "T-a", artist: "A", run: 3, day: "2026-04-01" });
});

it("spots a song played to death and then dropped", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  const peak = Array.from({ length: 25 }, (_, i) => play(at("2026-02-01", i), "burn"));
  await d.insert(plays).values([...peak, play("2026-05-01T10:00:00Z", "burn"), play("2026-06-01T10:00:00Z", "other")]);
  expect(await burnout(d, year2026)).toEqual([{ track: "T-burn", artist: "A", peakMonth: "2026-02", peakPlays: 25, afterPlays: 1 }]);
});

it("finds artists who blazed for one week", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  await d.insert(plays).values([
    ...Array.from({ length: 10 }, (_, i) => play(at("2026-03-03", i), "f", 4, "Flash")),
    play("2026-08-01T10:00:00Z", "f", 4, "Flash"),
    ...Array.from({ length: 10 }, (_, i) => play(at(`2026-0${3 + (i % 4)}-10`, i), "s", 4, "Steady")),
  ]);
  expect(await oneWeekWonders(d, year2026)).toEqual([{ artist: "Flash", week: "2026-03-02", minutes: 40 }]);
});
