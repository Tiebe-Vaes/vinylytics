"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { isOwner } from "@/lib/owner";
import { syncRecentlyPlayed } from "@/lib/spotify/sync";
import { logRun } from "@/lib/spotify/write";
import { geocodeCity } from "@/lib/weather";

/** "Sync now": the same work as the cron route, triggered by hand. */
export async function syncNow() {
  if (!(await isOwner())) throw new Error("unauthorized");
  const { seen, written } = await syncRecentlyPlayed();
  await logRun("api", { rowsSeen: seen, rowsWritten: written, ok: true });
  revalidatePath("/settings");
  revalidatePath("/");
}

const on = z.preprocess((v) => v === "on", z.boolean());
const publicForm = z.object({ enabled: on, eras: on, top: on, insights: on, nowPlaying: on });

/** The public page switch and which sections it shows. Checkboxes: present = on. */
export async function savePublicSettings(form: FormData) {
  if (!(await isOwner())) throw new Error("unauthorized");
  const f = publicForm.parse({
    enabled: form.get("enabled"),
    eras: form.get("eras"),
    top: form.get("top"),
    insights: form.get("insights"),
    nowPlaying: form.get("nowPlaying"),
  });
  const row = {
    publicEnabled: f.enabled,
    publicSections: { eras: f.eras, top: f.top, insights: f.insights, nowPlaying: f.nowPlaying },
  };
  await db().insert(schema.settings).values({ id: "owner", ...row }).onConflictDoUpdate({ target: schema.settings.id, set: row });
  revalidatePath("/settings");
  revalidatePath("/u");
}

/** "Weather you": find the city with Open-Meteo and store it; an empty field switches the stat off. */
export async function saveWeatherCity(form: FormData) {
  if (!(await isOwner())) throw new Error("unauthorized");
  const name = String(form.get("city") ?? "").trim().slice(0, 80);
  const place = name ? await geocodeCity(name) : null;
  if (name && !place) throw new Error("city not found");
  const row = { weatherCity: place?.name ?? null, weatherLat: place?.lat ?? null, weatherLon: place?.lon ?? null };
  await db().insert(schema.settings).values({ id: "owner", ...row }).onConflictDoUpdate({ target: schema.settings.id, set: row });
  // A new city means new weather: drop the old cache.
  await db().delete(schema.weatherDays);
  revalidatePath("/settings");
  revalidatePath("/recap");
}
