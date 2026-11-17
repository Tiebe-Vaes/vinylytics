"use server";

import { createHash } from "node:crypto";
import { revalidateTag } from "next/cache";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { isOwner } from "@/lib/owner";
import { getEras } from "@/lib/spotify/eras-data";
import { addDaysKey } from "@/lib/time";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function guard() {
  if (!(await isOwner())) throw new Error("unauthorized");
}

async function findEra(eraId: string) {
  const { eras } = await getEras();
  const i = eras.findIndex((e) => e.id === eraId);
  if (i === -1) throw new Error("unknown era");
  return { era: eras[i], next: eras[i + 1] ?? null };
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Names an era. Anchored on its middle day so the name survives boundary shifts; replaces an earlier rename of the same era. */
export async function renameEra(form: FormData) {
  await guard();
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
  revalidateTag("spotify", { expire: 0 });
}

/** Joins an era with the one after it. */
export async function mergeWithNext(form: FormData) {
  await guard();
  const { eraId, nextEraId } = z.object({ eraId: day, nextEraId: day }).parse({ eraId: form.get("eraId"), nextEraId: form.get("nextEraId") });
  const { era, next } = await findEra(eraId);
  // A replay must never merge a different neighbour after the first request succeeds.
  if (!next || next.id !== nextEraId) return;
  const o = schema.eraOverrides;
  const [existing] = await db().select({ id: o.id }).from(o)
    .where(and(eq(o.kind, "merge"), eq(o.fromDay, era.start), eq(o.toDay, next.end))).limit(1);
  if (existing) return;
  // A stable UUIDv8 makes concurrent requests for this range conflict on the primary key.
  const h = createHash("sha256").update(`merge:${era.start}:${next.end}`).digest("hex");
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
  await db().insert(o).values({ id, kind: "merge", fromDay: era.start, toDay: next.end }).onConflictDoNothing();
  revalidateTag("spotify", { expire: 0 });
}

export async function deleteOverride(form: FormData) {
  await guard();
  const { id } = z.object({ id: z.string().uuid() }).parse({ id: form.get("id") });
  await db().delete(schema.eraOverrides).where(eq(schema.eraOverrides.id, id));
  revalidateTag("spotify", { expire: 0 });
}
