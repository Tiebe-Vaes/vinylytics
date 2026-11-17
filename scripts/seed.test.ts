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
