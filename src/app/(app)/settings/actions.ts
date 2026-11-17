"use server";

import { revalidatePath } from "next/cache";
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
