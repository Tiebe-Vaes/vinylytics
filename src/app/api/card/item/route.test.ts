import { beforeAll, expect, it, vi } from "vitest";
import { resetDb, useTestDb } from "@/db/test-db";
import * as schema from "@/db/schema";
import { GET } from "./route";
import { GET as recap } from "../recap/route";

const viewer = vi.hoisted(() => ({ owner: true }));
vi.mock("@/lib/owner", () => ({ isOwner: async () => viewer.owner }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
const request = (path: string) => new Request("http://test.local/api/card/" + path);

beforeAll(async () => {
  const db = await useTestDb();
  await resetDb();
  await db.insert(schema.plays).values({ playedAt: new Date("2025-03-11T14:00:00Z"), uri: "spotify:track:synthetic",
    trackName: "Synthetic tone", artistName: "Test artist", kind: "track", msPlayed: 180000, source: "export" });
});

it("renders an imported item by URI or id and a recap only for a year with history", async () => {
  for (const key of ["spotify:track:synthetic", "synthetic"]) {
    const result = await GET(request(`item?kind=track&key=${key}&density=maximal`));
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect((await result.arrayBuffer()).byteLength).toBeGreaterThan(10000);
  }
  const result = await recap(request("recap?year=2025&density=maximal"));
  expect(result.headers.get("content-type")).toBe("image/png");
  expect((await result.arrayBuffer()).byteLength).toBeGreaterThan(10000);
  expect((await recap(request("recap?year=2024"))).status).toBe(404);
  expect((await GET(request("item?kind=artist&key=missing"))).status).toBe(404);
});

it("keeps item and recap cards private even when all public sections are enabled", async () => {
  const db = await useTestDb();
  await db.insert(schema.settings).values({ publicEnabled: true, publicSections: { eras: true, top: true, insights: true, nowPlaying: true } });
  viewer.owner = false;
  try {
    expect((await GET(request("item?kind=artist&key=Test%20artist"))).status).toBe(404);
    expect((await recap(request("recap?year=2025"))).status).toBe(404);
  } finally {
    viewer.owner = true;
  }
});
