import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { weatherYou } from "./weather";
import { play, year2026 } from "./test-helpers";

let d: Awaited<ReturnType<typeof useTestDb>>;
beforeAll(async () => { d = await useTestDb(); });
beforeEach(resetDb);
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("stays quiet and offline when no city is set", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await d.insert(schema.plays).values([play("2026-03-01T12:00:00Z", "x")]);
  expect(await weatherYou(d, year2026)).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("compares rainy-day and sunny-day listening", async () => {
  vi.stubEnv("TIMEZONE", "UTC");
  await d.insert(schema.settings).values({ id: "owner", weatherCity: "Ghent, Belgium", weatherLat: 51.05, weatherLon: 3.72 });
  await d.insert(schema.weatherDays).values([
    { day: "2026-03-01", code: 61, precipMm: 6, tempMaxC: 8 }, { day: "2026-03-02", code: 0, precipMm: 0, tempMaxC: 15 },
  ]);
  await d.insert(schema.plays).values([
    play("2026-03-01T12:00:00Z", "drizzle", 30, "Grey"), play("2026-03-02T12:00:00Z", "bright", 20, "Sunny"),
  ]);
  expect(await weatherYou(d, year2026)).toEqual({
    city: "Ghent, Belgium", rainyDays: 1,
    rainy: { artist: "Grey", track: "T-drizzle", minutes: 30 }, sunny: { artist: "Sunny", track: "T-bright", minutes: 20 },
  });
});
