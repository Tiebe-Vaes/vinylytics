import { describe, expect, it } from "vitest";
import { planMerge, type StoredPlay } from "./merge";
import type { PlayRow } from "./types";

const T = new Date("2026-03-01T20:00:00Z").getTime();
const play = (source: "api" | "export", offsetMs: number, uri: string | null = "spotify:track:a"): PlayRow => ({
  playedAt: new Date(T + offsetMs), msPlayed: 200_000, kind: "track", uri, trackName: "A", artistName: "X",
  albumName: null, reasonStart: null, reasonEnd: null, skipped: source === "export" ? false : null,
  shuffle: null, source,
});
const stored = (id: string, source: "api" | "export", offsetMs: number, uri = "spotify:track:a"): StoredPlay => ({
  id, uri, playedAt: new Date(T + offsetMs), source,
});

describe("planMerge", () => {
  it("lets an export play replace the api twin the live sync stored", () => {
    const r = planMerge([play("export", 2_000)], [stored("api1", "api", 0)]);
    expect(r.insert).toEqual([play("export", 2_000)]);
    expect(r.deleteIds).toEqual(["api1"]);
  });

  it("skips an api play when the export already has it", () => {
    const r = planMerge([play("api", 0)], [stored("ex1", "export", 3_000)]);
    expect(r).toEqual({ insert: [], deleteIds: [] });
  });

  it("skips an api play already stored by an earlier sync", () => {
    expect(planMerge([play("api", 500)], [stored("api1", "api", 0)])).toEqual({ insert: [], deleteIds: [] });
  });

  it("inserts a play with no twin", () => {
    expect(planMerge([play("export", 0)], [stored("api1", "api", 120_000)]).insert).toHaveLength(1);
  });

  it("inserts plays without a uri untouched", () => {
    const r = planMerge([play("export", 0, null)], [stored("x", "api", 0, "spotify:track:a")]);
    expect(r).toEqual({ insert: [play("export", 0, null)], deleteIds: [] });
  });

  it("keeps a real replay in the export, 30 s after another export play", () => {
    expect(planMerge([play("export", 30_000)], [stored("ex1", "export", 0)]).insert).toHaveLength(1);
  });

  it("keeps only the export side of twins arriving in the same batch", () => {
    const r = planMerge([play("api", 0), play("export", 2_000)], []);
    expect(r.insert).toEqual([play("export", 2_000)]);
  });
});
