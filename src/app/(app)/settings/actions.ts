"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { isOwner } from "@/lib/owner";
import { syncRecentlyPlayed } from "@/lib/spotify/sync";
import { logRun } from "@/lib/spotify/write";

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
