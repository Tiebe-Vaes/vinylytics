import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";

const owner = vi.hoisted(() => ({ yes: true }));
vi.mock("@/lib/owner", () => ({ isOwner: vi.fn(async () => owner.yes) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, revalidateTag: vi.fn() }));
const covers = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@/lib/card", async (orig) => ({
  ...(await orig<typeof import("@/lib/card")>()),
  coverData: vi.fn(async () => { covers.calls++; return null; }),
}));

const { GET } = await import("./route");
const call = (qs: string) => GET(new Request(`http://app.test/api/card/top?${qs}`));

describe("GET /api/card/top", () => {
  let d: Awaited<ReturnType<typeof useTestDb>>;
  beforeAll(async () => {
    d = await useTestDb();
    await resetDb();
    // Only old plays: nothing in the last 4 weeks, plenty all-time.
    await d.insert(schema.plays).values(
      Array.from({ length: 12 }, (_, i) => ({
        playedAt: new Date(Date.UTC(2025, 0, 1 + i, 12)), msPlayed: 200_000, kind: "track",
        uri: `spotify:track:t${i % 3}`, trackName: `T${i % 3}`, artistName: "Old Flame", source: "export",
      }))
    );
  });
  beforeEach(async () => {
    owner.yes = true;
    await d.delete(schema.settings);
  });

  it("lets the owner share any range", async () => {
    const res = await call("kind=artist&range=all");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("draws a cover mosaic for the grid view", async () => {
    const res = await call("kind=track&range=all&view=grid");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const { cardOptions } = await import("@/lib/card-options");
    expect(cardOptions(new URLSearchParams("view=grid"), "top", "cobalt").visual).toBe("mosaic");
  });

  it("exports only the owner's selected custom dates and rejects a reversed range", async () => {
    expect((await call("kind=track&sort=plays&range=custom&from=2025-01-01&to=2025-01-12")).status).toBe(200);
    expect((await call("kind=track&sort=plays&range=custom&from=2025-02-01&to=2025-02-02")).status).toBe(404);
    expect((await call("kind=track&range=custom&from=2025-02-02&to=2025-02-01")).status).toBe(400);
  });

  it("404s an anonymous visitor while the public top lists are off", async () => {
    owner.yes = false;
    expect((await call("kind=artist&range=4w")).status).toBe(404);
  });

  it("never fans out cover fetches for a visitor's mosaic", async () => {
    owner.yes = false;
    await d.insert(schema.settings).values({ publicEnabled: true, publicSections: { eras: false, top: true, insights: false, nowPlaying: false } });
    const recent = Array.from({ length: 9 }, (_, i) => ({
      playedAt: new Date(Date.now() - (i + 1) * 3_600_000), msPlayed: 200_000, kind: "track",
      uri: `spotify:track:r${i}`, trackName: `R${i}`, artistName: `Recent ${i}`, source: "export",
    }));
    await d.insert(schema.plays).values(recent);
    covers.calls = 0;
    try {
      expect((await call("kind=artist&range=4w&view=grid")).status).toBe(200);
      expect(covers.calls).toBe(0);
    } finally {
      await d.delete(schema.plays).where(inArray(schema.plays.uri, recent.map((r) => r.uri)));
    }
  });

  it("only gives visitors what the public page shows: the last 4 weeks", async () => {
    owner.yes = false;
    await d.insert(schema.settings).values({ publicEnabled: true, publicSections: { eras: false, top: true, insights: false, nowPlaying: false } });
    // All-time has data, 4 weeks has none: a visitor asking for all-time still gets the 4-week card (empty, so 404).
    expect((await call("kind=artist&range=all")).status).toBe(404);
    expect((await call("kind=album&range=all")).status).toBe(404);
  });
});
