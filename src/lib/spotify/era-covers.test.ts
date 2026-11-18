import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { hashInk, INKS } from "@/lib/ink";
import type { Era } from "./eras";
import { eraCovers, eraInstants, inkForCover } from "./era-covers";

describe("eraInstants", () => {
  afterEach(() => {
    delete process.env.TIMEZONE;
  });

  it("turns an era's local days into a UTC range, end day included", () => {
    process.env.TIMEZONE = "Europe/Brussels";
    const r = eraInstants({ start: "2026-03-02", end: "2026-03-08" });
    expect(r.from.toISOString()).toBe("2026-03-01T23:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-03-08T23:00:00.000Z");
  });
});

describe("inkForCover", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([INKS[5], INKS[20], INKS[40]])("presses an era in $id when its cover is that colour", async ({ id, hex }) => {
    const n = parseInt(hex.slice(1), 16);
    const solid = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: n >> 16, g: (n >> 8) & 255, b: n & 255 } } }).png().toBuffer();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(solid))));
    expect(await inkForCover(`https://i.scdn.co/image/solid-${id}`, "Lead")).toBe(id);
  });

  it("doesn't remember a failed fetch: the next call samples the cover", async () => {
    const blue = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 30, g: 80, b: 220 } } }).png().toBuffer();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("CDN hiccup"))
      .mockResolvedValue(new Response(new Uint8Array(blue)));
    vi.stubGlobal("fetch", fetchMock);
    const url = "https://i.scdn.co/image/flaky";
    expect(await inkForCover(url, "Lead")).toBe(hashInk("Lead"));
    expect(await inkForCover(url, "Lead")).toBe("cobalt");
    expect(await inkForCover(url, "Lead")).toBe("cobalt");
    expect(fetchMock).toHaveBeenCalledTimes(2); // success is remembered
  });
});

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
