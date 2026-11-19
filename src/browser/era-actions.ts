// Browser build only: stands in for `@/app/(app)/eras/actions` (server actions
// cannot exist in a static export). Same writes, straight into the local database.
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getEras } from "@/lib/spotify/eras-data";
import { addDaysKey } from "@/lib/time";
import { dataChanged } from "./render-page";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function findEra(eraId: string) {
  const { eras } = await getEras();
  const i = eras.findIndex((e) => e.id === eraId);
  if (i === -1) throw new Error("unknown era");
  return { era: eras[i], next: eras[i + 1] ?? null };
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Names an era, anchored on its middle day like the server action. */
export async function renameEra(form: FormData) {
  const { eraId, name } = z
    .object({ eraId: day, name: z.string().trim().min(1).max(80) })
    .parse({ eraId: form.get("eraId"), name: form.get("name") });
  const { era } = await findEra(eraId);
  const anchor = addDaysKey(era.start, Math.floor(daysBetween(era.start, era.end) / 2));
  const o = schema.eraOverrides;
  await db().transaction(async (tx) => {
    await tx.delete(o).where(and(eq(o.kind, "rename"), gte(o.anchor, era.start), lte(o.anchor, era.end)));
    await tx.insert(o).values({ kind: "rename", anchor, name });
  });
  dataChanged();
}

/** Joins an era with the one after it. One tab, so no replay guard is needed. */
export async function mergeWithNext(form: FormData) {
  const { eraId, nextEraId } = z.object({ eraId: day, nextEraId: day }).parse({ eraId: form.get("eraId"), nextEraId: form.get("nextEraId") });
  const { era, next } = await findEra(eraId);
  if (!next || next.id !== nextEraId) return;
  const o = schema.eraOverrides;
  const [existing] = await db().select({ id: o.id }).from(o)
    .where(and(eq(o.kind, "merge"), eq(o.fromDay, era.start), eq(o.toDay, next.end))).limit(1);
  if (existing) return;
  await db().insert(o).values({ id: crypto.randomUUID(), kind: "merge", fromDay: era.start, toDay: next.end });
  dataChanged();
}
