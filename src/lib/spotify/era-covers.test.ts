import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import type { Era } from "./eras";
import { eraCovers } from "./era-covers";

let d: Awaited<ReturnType<typeof useTestDb>>;
const era = (id: string, start: string, end: string): Era => ({
  id, start, end, weeks: 1, lead: "A", artists: [], minutes: 100, name: "A era", renamedBy: null,
});
const play = (day: string, uri: string) => ({
  playedAt: new Date(`${day}T12:00:00Z`), msPlayed: 60_000, kind: "track", uri, artistName: "A", source: "export",
});

describe("eraCovers", () => {
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(resetDb);

  it("gives each era the cover of its most-streamed track inside its range", async () => {
    await d.insert(schema.tracks).values([
      { uri: "t1", name: "T1", imageUrl: "https://i/1" },
      { uri: "t2", name: "T2", imageUrl: "https://i/2" },
    ]);
    await d.insert(schema.plays).values([
      play("2026-01-05", "t1"), play("2026-01-06", "t1"), play("2026-01-07", "t2"),
      play("2026-02-02", "t2"), play("2026-02-03", "t2"), play("2026-02-04", "t1"),
    ]);
    const covers = await eraCovers([era("jan", "2026-01-05", "2026-01-11"), era("feb", "2026-02-02", "2026-02-08")]);
    expect(covers.get("jan")).toBe("https://i/1");
    expect(covers.get("feb")).toBe("https://i/2");
  });

  it("gives null to an era without enriched tracks", async () => {
    await d.insert(schema.plays).values([play("2026-01-05", "t9")]);
    const covers = await eraCovers([era("jan", "2026-01-05", "2026-01-11")]);
    expect(covers.get("jan")).toBeNull();
  });

  it("handles no eras", async () => {
    expect((await eraCovers([])).size).toBe(0);
  });
});
