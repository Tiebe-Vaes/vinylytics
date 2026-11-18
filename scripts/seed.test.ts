import { describe, expect, it } from "vitest";
import { seedRows } from "./seed.mjs";

const now = new Date("2026-11-17T12:00:00Z");

describe("seedRows", () => {
  const rows = seedRows(now);

  it("makes about 6,000 plays over 18 months", () => {
    expect(rows.length).toBeGreaterThan(5000);
    expect(rows.length).toBeLessThan(7000);
    const oldest = Math.min(...rows.map((r) => r.playedAt.getTime()));
    expect((now.getTime() - oldest) / 86_400_000).toBeGreaterThan(530);
  });

  it("is deterministic", () => {
    expect(seedRows(now).slice(0, 50)).toEqual(rows.slice(0, 50));
  });

  it("has three phases, each led by a different artist", () => {
    const leader = (fromDays: number, toDays: number) => {
      const counts = new Map<string, number>();
      for (const r of rows) {
        const age = (now.getTime() - r.playedAt.getTime()) / 86_400_000;
        if (age >= fromDays && age < toDays) counts.set(r.artistName, (counts.get(r.artistName) ?? 0) + 1);
      }
      return [...counts].sort((a, b) => b[1] - a[1])[0][0];
    };
    const leaders = [leader(0, 180), leader(180, 360), leader(360, 540)];
    expect(new Set(leaders).size).toBe(3);
  });

  it("never repeats a (playedAt, uri) pair", () => {
    const keys = new Set(rows.map((r) => `${r.playedAt.toISOString()}|${r.uri}`));
    expect(keys.size).toBe(rows.length);
  });
});

describe("seed catalog", () => {
  it("gives every seeded track uri an album", async () => {
    const { seedCatalog } = await import("./seed.mjs");
    const { tracks, albums } = seedCatalog();
    const uris = new Set(seedRows(now).map((r) => r.uri));
    const byUri = new Map(tracks.map((t: { uri: string; albumId: string }) => [t.uri, t.albumId]));
    const albumIds = new Set(albums.map((a: { id: string }) => a.id));
    for (const uri of uris) expect(albumIds.has(byUri.get(uri)!)).toBe(true);
  });

  it("makes album completion and album charts non-empty", async () => {
    const { useTestDb, resetDb } = await import("@/db/test-db");
    const schema = await import("@/db/schema");
    const { seedPlays } = await import("./seed.mjs");
    const { getInsights } = await import("@/lib/spotify/insights");
    const { topItems } = await import("@/lib/spotify/charts");
    const db = await useTestDb();
    await resetDb();
    await seedPlays(db, schema, now);
    expect((await getInsights(null)).albumCompletion.length).toBeGreaterThan(0);
    expect((await topItems({ kind: "album", sort: "time", from: null, to: null, limit: 5 })).length).toBeGreaterThan(0);
  });
});
