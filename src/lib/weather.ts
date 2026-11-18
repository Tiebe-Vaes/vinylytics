import { and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { addDaysKey } from "@/lib/time";

/**
 * Open-Meteo, for the opt-in "Weather you" stat. Only a city name (to find it)
 * and its coordinates with a date range ever leave the server.
 */
const MAX_BYTES = 1024 * 1024;
const TIMEOUT_MS = 5000;

async function fetchJson<T>(url: string, shape: z.ZodType<T>): Promise<T | null> {
  try {
    const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const parsed = shape.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const geocoding = z.object({ results: z.array(z.object({ name: z.string(), country: z.string().optional(), latitude: z.number(), longitude: z.number() })).optional() });

export async function geocodeCity(name: string): Promise<{ name: string; lat: number; lon: number } | null> {
  const q = name.trim().slice(0, 80);
  if (!q) return null;
  const data = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: q, count: "1" })}`, geocoding);
  const hit = data?.results?.[0];
  return hit ? { name: [hit.name, hit.country].filter(Boolean).join(", "), lat: hit.latitude, lon: hit.longitude } : null;
}

const archive = z.object({
  daily: z.object({
    time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    weather_code: z.array(z.number().nullable()),
    precipitation_sum: z.array(z.number().nullable()),
    temperature_2m_max: z.array(z.number().nullable()),
  }),
});

/** Fills the cache for [from, to] (local date keys), fetching only the span of missing days. */
export async function ensureWeather(from: string, to: string, lat: number, lon: number): Promise<void> {
  const have = new Set((await db().select({ day: schema.weatherDays.day }).from(schema.weatherDays)
    .where(and(gte(schema.weatherDays.day, from), lte(schema.weatherDays.day, to)))).map((r) => r.day));
  const missing: string[] = [];
  for (let k = from; k <= to; k = addDaysKey(k, 1)) if (!have.has(k)) missing.push(k);
  if (!missing.length) return;
  const params = new URLSearchParams({
    latitude: lat.toFixed(2), longitude: lon.toFixed(2), start_date: missing[0], end_date: missing.at(-1)!,
    daily: "weather_code,precipitation_sum,temperature_2m_max", timezone: "auto",
  });
  const data = await fetchJson(`https://archive-api.open-meteo.com/v1/archive?${params}`, archive);
  if (!data) return;
  const { time, weather_code, precipitation_sum, temperature_2m_max } = data.daily;
  const rows = time.map((day, i) => ({ day, code: weather_code[i], precipMm: precipitation_sum[i], tempMaxC: temperature_2m_max[i] }))
    .filter((r) => !have.has(r.day));
  if (rows.length) await db().insert(schema.weatherDays).values(rows).onConflictDoNothing();
}
