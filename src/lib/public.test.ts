import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { addDaysKey } from "@/lib/time";

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: vi.fn() }));
const { publicPayload, publicAllows } = await import("./public");

let d: Awaited<ReturnType<typeof useTestDb>>;

async function seed() {
  const rows = [];
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < 20; k++) {
      rows.push({
        playedAt: new Date(Date.parse(`${addDaysKey("2026-01-05", 7 * i)}T08:00:00Z`) + k * 300_000),
        msPlayed: 240_000, kind: "track", uri: `spotify:track:t${k % 6}`, trackName: `Track ${k % 6}`, artistName: "Mira Vale", source: "export",
      });
    }
  }
  await d.insert(schema.plays).values(rows);
  await d.insert(schema.auth).values({ spotifyUserId: "owner-id-123", refreshToken: "refresh-secret", accessToken: "access-secret" });
}

describe("public page", () => {
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(async () => {
    await resetDb();
    await seed();
  });

  it("is off by default", async () => {
    expect(await publicPayload()).toBeNull();
    expect(await publicAllows("eras")).toBe(false);
  });

  it("shows only the sections the owner switched on", async () => {
    await d.insert(schema.settings).values({ publicEnabled: true, publicSections: { eras: true, top: false, insights: false, nowPlaying: false } });
    const p = await publicPayload();
    expect(p).not.toBeNull();
    const sections = p!.sections;
    expect(Object.keys(sections).filter((k) => sections[k as keyof typeof sections])).toEqual(["eras"]);
    expect(p!.eras?.length).toBeGreaterThan(0);
    expect(p!.top).toBeUndefined();
    expect(p!.insights).toBeUndefined();
    expect(await publicAllows("eras")).toBe(true);
    expect(await publicAllows("top")).toBe(false);
  });

  it("never carries tokens or the owner's Spotify id", async () => {
    await d.insert(schema.settings).values({ publicEnabled: true, publicSections: { eras: true, top: true, insights: true, nowPlaying: true } });
    const json = JSON.stringify(await publicPayload());
    for (const secret of ["refresh-secret", "access-secret", "owner-id-123", "refreshToken", "accessToken", "spotifyUserId"]) {
      expect(json).not.toContain(secret);
    }
  });
});
