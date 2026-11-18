import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { ensureWeather, geocodeCity } from "./weather";

let d: Awaited<ReturnType<typeof useTestDb>>;
beforeAll(async () => { d = await useTestDb(); });
beforeEach(resetDb);
afterEach(() => vi.unstubAllGlobals());

const archive = (days: string[]) => new Response(JSON.stringify({
  daily: { time: days, weather_code: days.map(() => 61), precipitation_sum: days.map(() => 4.2), temperature_2m_max: days.map(() => 11) },
}), { headers: { "content-type": "application/json" } });

it("finds a city's coordinates, or null when nothing matches", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ results: [{ name: "Ghent", country: "Belgium", latitude: 51.05, longitude: 3.72 }] })));
  vi.stubGlobal("fetch", fetchMock);
  expect(await geocodeCity("Ghent")).toEqual({ name: "Ghent, Belgium", lat: 51.05, lon: 3.72 });
  expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain("name=Ghent");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}))));
  expect(await geocodeCity("Nowhere")).toBeNull();
});

it("only asks Open-Meteo for days it doesn't have yet", async () => {
  await d.insert(schema.weatherDays).values([{ day: "2026-03-01", code: 0, precipMm: 0, tempMaxC: 9 }]);
  const fetchMock = vi.fn(async () => archive(["2026-03-02", "2026-03-03"]));
  vi.stubGlobal("fetch", fetchMock);
  await ensureWeather("2026-03-01", "2026-03-03", 51.05, 3.72);
  const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
  expect([url.searchParams.get("start_date"), url.searchParams.get("end_date")]).toEqual(["2026-03-02", "2026-03-03"]);
  expect((await d.select().from(schema.weatherDays)).length).toBe(3);
  fetchMock.mockClear();
  await ensureWeather("2026-03-01", "2026-03-03", 51.05, 3.72);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("leaves the cache untouched when the response is invalid or too big", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ daily: { time: "nope" } }))));
  await ensureWeather("2026-03-01", "2026-03-02", 51, 3);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(1024 * 1024 + 1))));
  await ensureWeather("2026-03-01", "2026-03-02", 51, 3);
  expect(await d.select().from(schema.weatherDays)).toEqual([]);
});
